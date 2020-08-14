const EventEmitter = require('events');
const uuidv4 = require('uuid/v4');
const { proto, DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const ProcessingModuleProto = proto.ubii.processing.ProcessingModule;

class ProcessingModule extends EventEmitter {
  constructor(
    specs = {
      id: uuidv4(),
      name: '',
      authors: [],
      tags: [],
      description: '',
      clientId: undefined
    }
  ) {
    super();

    Object.assign(this, specs);

    this.status = ProcessingModuleProto.Status.CREATED;
  }
}

module.exports = { ProcessingModule: ProcessingModule };
