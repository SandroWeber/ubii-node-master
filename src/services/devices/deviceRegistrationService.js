const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const { LoggingService } = require('@tum-far/ubii-node-nodejs');

const { Service } = require('../service.js');
const { ClientManager } = require('../../clients/clientManager.js');

const logger = LoggingService.instance.logger;

class DeviceRegistrationService extends Service {
  static LOG_TAG = 'DeviceRegistrationService';

  constructor(deviceManager) {
    super(DEFAULT_TOPICS.SERVICES.DEVICE_REGISTRATION, MSG_TYPES.DEVICE, MSG_TYPES.DEVICE + ', ' + MSG_TYPES.ERROR);

    this.deviceManager = deviceManager;
  }

  reply(requestedDeviceSpecs) {
    // Verify the device and act accordingly.
    if (!ClientManager.instance.verifyClient(requestedDeviceSpecs.clientId)) {
      let msg = `There is no Client registered with ID "${requestedDeviceSpecs.clientId}"`;
      logger.error({ label: DeviceRegistrationService.LOG_TAG, message: msg });

      return {
        error: {
          title: DeviceRegistrationService.LOG_TAG,
          message: msg
        }
      };
    }

    // Process the registration of the sepcified device at the device manager
    let deviceSpecs = undefined;
    try {
      deviceSpecs = this.deviceManager.registerDeviceSpecs(requestedDeviceSpecs);
    } catch (error) {
      console.error(error);
      return {
        error: {
          title: DeviceRegistrationService.LOG_TAG,
          message: error && error.toString(),
          stack: error.stack && error.stack.toString()
        }
      };
    }

    if (deviceSpecs !== undefined) {
      return { device: deviceSpecs };
    } else {
      return {
        error: {
          title: DeviceRegistrationService.LOG_TAG,
          message: 'device manager returned undefined'
        }
      };
    }
  }
}

module.exports = {
  DeviceRegistrationService: DeviceRegistrationService
};
