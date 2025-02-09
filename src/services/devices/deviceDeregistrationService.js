const { LoggingService } = require('@tum-far/ubii-node-nodejs');
const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../service.js');
const { ClientManager } = require('../../clients/clientManager.js');

const logger = LoggingService.instance.logger;
const LOG_TAG = '[UBII DeviceDeregistrationService]';

class DeviceDeregistrationService extends Service {

  constructor(deviceManager) {
    super(DEFAULT_TOPICS.SERVICES.DEVICE_DEREGISTRATION, MSG_TYPES.DEVICE, MSG_TYPES.SUCCESS + ', ' + MSG_TYPES.ERROR);

    this.deviceManager = deviceManager;
  }

  reply(message) {
    // Verify the device and act accordingly.
    if (!ClientManager.instance.verifyClient(message.clientId)) {
      let errorMessage = 'There is no Client registered with the ID ' + message.clientId;

      logger.error({ label: LOG_TAG, message: errorMessage });

      return {
        error: {
          title: LOG_TAG,
          message: errorMessage
        }
      };
    }

    // Process the registration of the sepcified device at the device manager
    try {
      this.deviceManager.removeDevice(message.id);

      logger.info({ label: LOG_TAG, message: 'successfully removed device ' + message.id });

      return {
        success: {
          title: LOG_TAG,
          message: 'Device with ID ' + message.id + ' successfully removed.'
        }
      };
    } catch (error) {
      return {
        error: {
          title: LOG_TAG,
          message: error && error.toString(),
          stack: error.stack && error.stack.toString()
        }
      };
    }
  }
}

module.exports = {
  DeviceDeregistrationService: DeviceDeregistrationService
};
