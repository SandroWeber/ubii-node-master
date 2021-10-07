const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const { ProcessingModuleManager } = require('@tum-far/ubii-node-nodejs/src/index');

const { Service } = require('../service.js');

/**
 * Handles requests from client nodes to add processing modules to the runtime of their
 * respective session as active and processing.
 */
class ProcessingModuleRuntimeRemoveService extends Service {
  constructor(processingModuleManager, sessionManager) {
    super(
      DEFAULT_TOPICS.SERVICES.PM_RUNTIME_REMOVE,
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
        this.processingModuleManager.emit(ProcessingModuleManager.EVENTS.PM_STOPPED, pm);
      } else {
        invalidPMs.push(pm);
      }
    });

    if (invalidPMs.length > 0) {
      return {
        error: {
          title: 'ProcessingModuleRuntimeRemoveService',
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
          title: 'ProcessingModuleRuntimeRemoveService',
          message: 'all processing modules verified to be removed'
        }
      };
    }
  }
}

module.exports = ProcessingModuleRuntimeRemoveService;
