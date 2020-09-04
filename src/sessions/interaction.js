const EventEmitter = require('events');
const uuidv4 = require('uuid/v4');
const { proto, DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const InteractionStatus = proto.ubii.interactions.InteractionStatus;

const ExternalLibrariesService = require('./externalLibrariesService');
const { INTERACTION_LIFECYCLE_EVENTS } = require('./constants');
const Utils = require('../utilities');

class Interaction extends EventEmitter {
  constructor({
    id = uuidv4(),
    name = 'new-interaction',
    authors = [],
    tags = [],
    description = '',
    processFrequency = 30, // 30 Hz
    processingCallback = undefined,
    inputFormats = [],
    outputFormats = [],
    onCreated = undefined
  }) {
    super();

    this.id = id;
    this.name = name;
    this.authors = authors;
    this.tags = tags;
    this.description = description;
    this.processFrequency = processFrequency;
    this.processingCallback = Utils.createFunctionFromString(processingCallback);
    this.inputFormats = inputFormats;
    this.outputFormats = outputFormats;
    if (onCreated) {
      this.onCreatedCallback = Utils.createFunctionFromString(onCreated);
    }

    this.state = {};
    Object.defineProperty(this.state, 'modules', {
      // modules are read-only
      get: () => {
        return ExternalLibrariesService.getExternalLibraries();
      },
      configurable: true
    });

    this.inputProxy = {};
    this.outputProxy = {};

    this.status = InteractionStatus.CREATED;

    this.on(INTERACTION_LIFECYCLE_EVENTS.AFTER_PROCESS, this.onEventAfterProcess);
  }

  /* I/O functions */
  setTopicData(topicData) {
    this.topicData = topicData;
  }

  hasInput(name) {
    return this.inputFormats.some((input) => {
      return input.internalName === name;
    });
  }

  getInputFormat(name) {
    return this.inputFormats.find((input) => {
      input.internalName === name;
    });
  }

  hasOutput(name) {
    return this.outputFormats.some((output) => {
      return output.internalName === name;
    });
  }

  getOutputFormat(name) {
    return this.outputFormats.find((output) => {
      return output.internalName === name;
    });
  }

  connectInputTopic(internalName, externalTopic) {
    if (!this.topicData) {
      console.warn(
        'Interaction(' + this.id + ').connectInputTopic() - missing topicData == ' + this.topicData
      );
      return false;
    }

    if (this.inputProxy[internalName]) {
      delete this.inputProxy[internalName];
    }
    Object.defineProperty(this.inputProxy, internalName, {
      // input is read-only
      get: () => {
        let entry = this.topicData.pull(externalTopic);
        return entry && entry.data;
      },
      configurable: true
    });

    return true;
  }

  disconnectInputTopic(internalName) {
    delete this.inputProxy[internalName];
  }

  connectOutputTopic(internalName, externalTopic) {
    if (!this.topicData) {
      console.warn(
        'Interaction(' + this.id + ').connectOutputTopic() - missing topicData == ' + this.topicData
      );
      return false;
    }

    if (this.outputProxy[internalName]) {
      delete this.outputProxy[internalName];
    }

    let type = Utils.getTopicDataTypeFromMessageFormat(
      this.getOutputFormat(internalName).messageFormat
    );
    Object.defineProperty(this.outputProxy, internalName, {
      // output is write-only
      set: (value) => {
        this.topicData.publish(externalTopic, value, type);
      },
      configurable: true
    });

    return true;
  }

  disconnectOutputTopic(internalName) {
    delete this.outputProxy[internalName];
  }

  connectMultiplexer(internalName, multiplexer) {
    if (this.inputProxy[internalName]) {
      delete this.inputProxy[internalName];
    }

    Object.defineProperty(this.inputProxy, internalName, {
      // input is read-only
      get: () => {
        return multiplexer.get();
      },
      configurable: true
    });
  }

  disconnectMultiplexer(internalName) {
    delete this.inputProxy[internalName];
  }

  connectDemultiplexer(internalName, demultiplexer) {
    if (this.outputProxy[internalName]) {
      delete this.outputProxy[internalName];
    }

    Object.defineProperty(this.outputProxy, internalName, {
      // output is write-only
      set: (value) => {
        demultiplexer.push(value);
      },
      configurable: true
    });

    return true;
  }

  disconnectDemultiplexer(internalName) {
    delete this.outputProxy[internalName];
  }

  disconnectIO() {
    this.inputProxy = {};
    this.outputProxy = {};
  }
  /* I/O functions end */

  /* processing functions */
  setProcessingCallback(callback) {
    if (typeof callback !== 'function') return;

    this.processingCallback = callback;
  }

  process() {
    if (this.status !== InteractionStatus.PROCESSING) {
      return;
    }

    if (typeof this.processingCallback !== 'function') {
      console.warn(
        'Interaction(' +
          this.id +
          ').process() - processingCallback not a function == ' +
          this.processingCallback
      );
      return false;
    }

    this.processingCallback(this.inputProxy, this.outputProxy, this.state);
    this.emit(INTERACTION_LIFECYCLE_EVENTS.AFTER_PROCESS);
  }

  run() {
    if (this.status !== InteractionStatus.INITIALIZED && this.status !== InteractionStatus.HALTED) {
      setTimeout(() => {
        this.run();
      }, 500);
      return;
    }

    this.status = InteractionStatus.PROCESSING;

    let processAtFrequency = () => {
      this.process();
      if (this.status === InteractionStatus.PROCESSING) {
        setTimeout(() => {
          processAtFrequency();
        }, 1000 / this.processFrequency);
      }
    };

    processAtFrequency();
  }

  /* lifecycle functions */

  async onCreated() {
    if (this.onCreatedCallback) {
      try {
        await this.onCreatedCallback(this.state);
      } catch (error) {
        console.warn(error);
      }
    }

    this.status = InteractionStatus.INITIALIZED;
  }

  /* event related functions */

  onEventAfterProcess() {
    this.topicData.publish(
      DEFAULT_TOPICS.INFO_TOPICS.PROCESSED_INTERACTION,
      { id: this.id },
      Utils.getTopicDataTypeFromMessageFormat(MSG_TYPES.INTERACTION)
    );
  }

  /* helper functions */

  toProtobuf() {
    return {
      id: this.id,
      name: this.name,
      authors: this.authors,
      tags: this.tags,
      description: this.description,
      processFrequency: this.processFrequency,
      processingCallback: this.processingCallback.toString(),
      inputFormats: this.inputFormats,
      outputFormats: this.outputFormats,
      onCreated: this.onCreatedCallback && this.onCreatedCallback.toString()
    };
  }
}

module.exports = {
  Interaction: Interaction
};
