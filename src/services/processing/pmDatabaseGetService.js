const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('./../service.js');
const ProcessingModuleStorage = require('../../storage/processingModuleStorage');

class ProcessingModuleDatabaseGetService extends Service {
  constructor() {
    super(
      DEFAULT_TOPICS.SERVICES.PM_DATABASE_GET,
      MSG_TYPES.PM,
      MSG_TYPES.PM_LIST + ', ' + MSG_TYPES.ERROR
    );
  }

  reply(pmMessage) {
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

module.exports = new ProcessingModuleDatabaseGetService();
