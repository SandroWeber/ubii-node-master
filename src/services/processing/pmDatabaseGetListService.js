const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const { ProcessingModuleStorage } = require('@tum-far/ubii-node-nodejs');

const { Service } = require('../service.js');

//TODO: rename to RuntimeGetList
class ProcessingModuleDatabaseGetListService extends Service {
  constructor(clientManager) {
    super(
      DEFAULT_TOPICS.SERVICES.PM_DATABASE_GET_LIST,
      undefined,
      MSG_TYPES.PM_LIST + ', ' + MSG_TYPES.ERROR
    );

    this.clientManager = clientManager;
  }

  reply() {
    let pmList = ProcessingModuleStorage.instance.getAllSpecs();
    this.clientManager.getClientList().forEach(client => {
      client.processingModules.forEach(pm => {
        pmList.push(pm);
      })
    });

    if (typeof pmList === 'undefined') {
      return {
        error: {
          title: 'ProcessingModuleDatabaseGetService Error',
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

module.exports = ProcessingModuleDatabaseGetListService;
