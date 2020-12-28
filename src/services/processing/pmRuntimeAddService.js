const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('./../service.js');
const ProcessingModuleStorage = require('../../storage/processingModuleStorage');

class ProcessingModuleRuntimeAddService extends Service {
  constructor(processingModuleManager) {
    super(
      DEFAULT_TOPICS.SERVICES.PM_RUNTIME_ADD,
      MSG_TYPES.PM_LIST,
      MSG_TYPES.SUCCESS + ', ' + MSG_TYPES.ERROR
    );

    this.processingModuleManager = processingModuleManager;
  }

  reply(msg) {
    let pmSpecList = msg.processingModuleList && msg.processingModuleList.elements;
    let pm = ProcessingModuleStorage.getByName(pmMessage.name);
    if (typeof pm === 'undefined') {
      return {
        error: {
          title: 'ProcessingModuleGetService Error',
          message: 'Could not find processing module with name ' + pmMessage.name
        }
      };
    } else {
      return {
        processingModuleList: {
          elements: [pm.protobuf]
        }
      };
    }
  }
}

module.exports = new ProcessingModuleRuntimeAddService();
