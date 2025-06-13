const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const { LoggingService } = require('@tum-far/ubii-node-nodejs');

const { Service } = require('../service.js');
const { ClientManager } = require('../../clients/clientManager.js');

const logger = LoggingService.instance.logger;

class ComponentRegistrationService extends Service {
  static LOG_TAG = 'ComponentRegistrationService';

  constructor(deviceManager) {
    super(
      DEFAULT_TOPICS.SERVICES.COMPONENT_REGISTRATION,
      MSG_TYPES.COMPONENT,
      MSG_TYPES.COMPONENT + ', ' + MSG_TYPES.ERROR
    );

    this.deviceManager = deviceManager;
  }

  reply(specs) {
    // Verify the device and act accordingly.
    if (!ClientManager.instance.verifyClient(specs.clientId)) {
      let msg = `There is no Client registered with ID "${specs.clientId}"`;
      logger.error({ label: ComponentRegistrationService.LOG_TAG, message: msg });

      return {
        error: {
          title: ComponentRegistrationService.LOG_TAG,
          message: msg
        }
      };
    }

    // Process the registration of the sepcified device at the device manager
    let component = undefined;
    try {
      component = this.deviceManager.registerComponentSpecs(specs);
    } catch (error) {
      console.error(error);
      return {
        error: {
          title: ComponentRegistrationService.LOG_TAG,
          message: error && error.toString(),
          stack: error.stack && error.stack.toString()
        }
      };
    }

    if (component !== undefined) {
      let specs = component.toProtobuf();
      return { component: specs };
    } else {
      errorMsg = 'Device manager returned undefined when trying to register component';
      logger.error({ label: ComponentRegistrationService.LOG_TAG, message: errorMsg });
      return {
        error: {
          title: ComponentRegistrationService.LOG_TAG,
          message: errorMsg
        }
      };
    }
  }
}

module.exports = {
  ComponentRegistrationService: ComponentRegistrationService
};
