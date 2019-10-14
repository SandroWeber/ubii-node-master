const EventEmitter = require('events');

const uuidv4 = require('uuid/v4');
const tf = require('@tensorflow/tfjs-node');
const cocoSsd = require('@tensorflow-models/coco-ssd');
const emgClassifier = require('@baumlos/emg-classifier');
const cv = require('opencv4nodejs');
const fs = require('fs');

const Utils = require('../utilities');
const { INTERACTION_STATUS } = require('./constants');

class Interaction {
  constructor({
    id = uuidv4(),
    name = '',
    authors = [],
    tags = [],
    description = '',
    processFrequency = 30, // 30 Hz
    processingCallback = undefined,
    inputFormats = [],
    outputFormats = [],
    onCreated = undefined
  }) {
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
      // input is read-only
      get: () => {
        return {
          tf: tf,
          cocoSsd: cocoSsd,
          emgClassifier: emgClassifier,
          cv: cv,
          fs: fs
        }
      },
      configurable: true
    });

    this.inputProxy = {};
    this.outputProxy = {};

    this.events = new EventEmitter();
    this.status = INTERACTION_STATUS.CREATED;
  }

  /* I/O functions */
  setTopicData(topicData) {
    this.topicData = topicData;
  }

  hasInput(name) {
    return this.inputFormats.some(input => {
      return input.internalName === name;
    });
  }

  getInputFormat(name) {
    return this.inputFormats.find(input => {
      input.internalName === name;
    });
  }

  hasOutput(name) {
    return this.outputFormats.some(output => {
      return output.internalName === name;
    });
  }

  getOutputFormat(name) {
    return this.outputFormats.find(output => {
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

    let type = Utils.getTopicDataTypeFromMessageFormat(this.getOutputFormat(internalName).messageFormat);
    Object.defineProperty(this.outputProxy, internalName, {
      // output is write-only
      set: value => {
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
      set: value => {
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
    if (this.status !== INTERACTION_STATUS.PROCESSING) {
      return;
    }

    //this.events.emit(INTERACTION_LIFECYCLE_EVENTS.PROCESS);
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
  }

  run() {
    if (this.status !== INTERACTION_STATUS.INITIALIZED && this.status !== INTERACTION_STATUS.STOPPED) {
      setTimeout(() => { this.run(); }, 500);
      return;
    }

    this.status = INTERACTION_STATUS.PROCESSING;

    let processAtFrequency = () => {
      this.process();
      if (this.status === INTERACTION_STATUS.PROCESSING) {
        setTimeout(() => {
          processAtFrequency();
        }, 1000 / this.processFrequency);
      }
    }

    processAtFrequency();
  }
  /* processing functions end*/

  /* lifecycle functions */
  async onCreated() {
    if (this.onCreatedCallback) {
      try {
        await this.onCreatedCallback(this.state);
      }
      catch (error) {
        console.warn(error);
      }
    }

    this.status = INTERACTION_STATUS.INITIALIZED;
  }
  /* lifecycle functions end */

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
