const uuidv4 = require('uuid/v4');

const Utils = require('./utilities');

class Interaction {
  constructor({
    id = uuidv4(),
    name = '',
    processingCallback = undefined,
    inputFormats = [],
    outputFormats = []
  }) {
    this.id = id;
    this.name = name;
    this.processingCallback = Utils.createFunctionFromString(processingCallback);
    this.inputFormats = inputFormats;
    this.outputFormats = outputFormats;

    this.state = {};
    this.inputProxy = {};
    this.outputProxy = {};
  }

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

  connectInput(internalName, externalTopic) {
    if (!this.topicData) {
      console.log(
        'Interaction(' + this.id + ').connectInput() - missing topicData == ' + this.topicData
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

  disconnectInput(internalName) {
    delete this.inputProxy[internalName];
  }

  connectOutput(internalName, externalTopic) {
    if (!this.topicData) {
      console.info(
        'Interaction(' + this.id + ').connectOutput() - missing topicData == ' + this.topicData
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

  disconnectOutput(internalName) {
    delete this.outputProxy[internalName];
  }

  connectMultiplexer(internalName, multiplexer) {
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

  disconnectIO() {
    this.inputProxy = {};
    this.outputProxy = {};
  }

  setProcessingCallback(callback) {
    if (typeof callback !== 'function') return;

    this.processingCallback = callback;
  }

  process() {
    if (typeof this.processingCallback !== 'function') {
      console.log(
        'Interaction(' +
          this.id +
          ').process() - processingCallback not a function == ' +
          this.processingCallback
      );
      return false;
    }

    this.processingCallback(this.inputProxy, this.outputProxy, this.state);
  }

  toProtobuf() {
    return {
      id: this.id,
      name: this.name,
      processingCallback: this.processingCallback.toString(),
      inputFormats: this.inputFormats,
      outputFormats: this.outputFormats
    };
  }
}

module.exports = {
  Interaction: Interaction
};
