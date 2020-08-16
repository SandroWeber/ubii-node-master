const EventEmitter = require('events');
const uuidv4 = require('uuid/v4');
const { proto, DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const ProcessingModuleProto = proto.ubii.processing.ProcessingModule;
const namida = require('@tum-far/namida/src/namida');

class ProcessingModule extends EventEmitter {
  constructor(
    specs = {
      id: uuidv4(),
      name: '',
      authors: [],
      tags: [],
      description: '',
      inputs: [],
      outputs: [],
      clientId: undefined,
      language: ProcessingModuleProto.Language.JS
    }
  ) {
    super();

    if (specs.language === undefined) specs.language = ProcessingModuleProto.Language.JS;
    if (specs.language !== ProcessingModuleProto.Language.JS) {
      namida.error(
        'ProcessingModule',
        'trying to create module under javascript, but specification says ' +
          ProcessingModuleProto.Language[specs.language]
      );
      throw new Error(
        'Incompatible language specifications (javascript vs. ' +
          ProcessingModuleProto.Language[specs.language] +
          ')'
      );
    }

    // take over specs and add ID if missing
    //this.specs = specs;
    Object.assign(this, specs);
    if (!this.id) {
      this.id = uuidv4();
    }

    if (this.onCreatedStringified) {
      this.onCreated = Utils.createFunctionFromString(onCreatedStringified);
    }
    if (this.onProcessingStringified) {
      this.onProcessing = Utils.createFunctionFromString(onProcessingStringified);
    }
    if (this.onHaltedStringified) {
      this.onHalted = Utils.createFunctionFromString(onHaltedStringified);
    }
    if (this.onDestroyedStringified) {
      this.onDestroyed = Utils.createFunctionFromString(onDestroyedStringified);
    }

    this.status = ProcessingModuleProto.Status.CREATED;
  }

  /* lifecycle functions */

  setOnCreated(callback) {
    this.onCreated = callback;
  }

  setOnProcessing(callback) {
    this.onProcessing = callback;
  }

  setOnHalted(callback) {
    this.onHalted = callback;
  }

  setOnDestroyed(callback) {
    this.onDestroyed = callback;
  }

  onCreated() {}

  onProcessing() {
    namida.error(
      'ProcessingModule',
      'onProcessing callback is not specified, module ' + this.name + ' will not do anything?'
    );
    throw new Error(
      'ProcessingModule ' +
        this.name +
        ' (' +
        this.id +
        ') - onProcessing() callback is not specified'
    );
  }

  onHalted() {}

  onDestroyed() {}

  /* lifecycle functions end*/

  /* I/O functions */
  setTopicData(topicData) {
    this.topicData = topicData;
  }

  hasInput(name) {
    return this.inputs.some((input) => {
      return input.internalName === name;
    });
  }

  getInput(name) {
    return this.inputs.find((input) => {
      input.internalName === name;
    });
  }

  hasOutput(name) {
    return this.outputs.some((output) => {
      return output.internalName === name;
    });
  }

  getOutput(name) {
    return this.outputs.find((output) => {
      return output.internalName === name;
    });
  }

  connectInputTopic(internalName, externalTopic) {
    if (!this.topicData) {
      namida.error(
        'ProcessingModule',
        'Module ' +
          this.id +
          ' is trying to connect input ' +
          internalName +
          ' to topic ' +
          externalTopic +
          ' but TopicData is not set!'
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
      namida.error(
        'ProcessingModule',
        'Module ' +
          this.id +
          ' is trying to connect output ' +
          internalName +
          ' to topic ' +
          externalTopic +
          ' but TopicData is not set!'
      );
      return false;
    }

    if (this.outputProxy[internalName]) {
      delete this.outputProxy[internalName];
    }

    let type = Utils.getTopicDataTypeFromMessageFormat(this.getOutput(internalName).messageFormat);
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
}

module.exports = { ProcessingModule: ProcessingModule };
