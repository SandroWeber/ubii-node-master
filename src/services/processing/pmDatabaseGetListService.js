const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../service.js');

//TODO: rename to RuntimeGetList
class ProcessingModuleDatabaseGetService extends Service {
  constructor(processingModuleManager) {
    super(
      DEFAULT_TOPICS.SERVICES.PM_DATABASE_GET_LIST,
      undefined,
      MSG_TYPES.PM_LIST + ', ' + MSG_TYPES.ERROR
    );

    this.processingModuleManager = processingModuleManager;
  }

  reply() {
    let pmList = Array.from(this.processingModuleManager.processingModules.values()).map(pm => pm.toProtobuf());

    if (typeof pmList === 'undefined') {
      return {
        error: {
          title: 'ProcessingModuleGetListService Error',
          message: 'error getting list of PMs'
        }
      };
    } else {
      return {
        processingModuleList: {
          elements: pmList
        }
      };
    }
  }
}

module.exports = ProcessingModuleDatabaseGetService;
