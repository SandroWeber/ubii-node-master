const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('./../service.js');
const ProcessingModuleManager = require('../../processing/processingModuleManager');

class ProcessingModuleRuntimeAddService extends Service {
  constructor(processingModuleManager, sessionManager) {
    super(
      DEFAULT_TOPICS.SERVICES.PM_RUNTIME_ADD,
      MSG_TYPES.PM_LIST,
      MSG_TYPES.SUCCESS + ', ' + MSG_TYPES.ERROR
    );

    this.processingModuleManager = processingModuleManager;
    this.sessionManager = sessionManager;
  }

  reply(msg) {
    let pmSpecList = msg && msg.elements;

    let invalidPMs = [];
    pmSpecList.forEach((pm) => {
      if (this.sessionManager.verifyRemoteProcessingModule(pm)) {
        this.processingModuleManager.emit(ProcessingModuleManager.EVENTS.PM_STARTED, pm);
      } else {
        invalidPMs.push(pm);
      }
    });

    if (invalidPMs.length > 0) {
      return {
        error: {
          title: 'ProcessingModuleRuntimeAddService',
          message:
            'not all processing modules could be verified: ' +
            invalidPMs.map((pm) => {
              return pm.id;
            })
        }
      };
    } else {
      return {
        success: {
          title: 'ProcessingModuleRuntimeAddService',
          message: 'all processing modules verified to be started'
        }
      };
    }
  }
}

module.exports = ProcessingModuleRuntimeAddService;
