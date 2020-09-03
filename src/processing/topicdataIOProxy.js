const EventEmitter = require('events');
const uuidv4 = require('uuid/v4');
const { proto, DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const ProcessingModuleProto = proto.ubii.processing.ProcessingModule;
const ProcessingMode = proto.ubii.processing.ProcessingMode;
const namida = require('@tum-far/namida/src/namida');

class TopicdataIOProxy extends EventEmitter {
  constructor() {
    super();
  }

  get(name) {
    return this[name];
  }

  set(name, value) {
    this[name] = value;
  }
}

module.exports = TopicdataIOProxy;
