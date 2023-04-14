const namida = require('@tum-far/namida');
const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../service.js');

const { ClientManager } = require('../../clients/clientManager.js');


const LOG_TAG = 'DeviceRegistrationService';

class DeviceRegistrationService extends Service {
  constructor(deviceManager) {
    super(
      DEFAULT_TOPICS.SERVICES.DEVICE_REGISTRATION,
      MSG_TYPES.DEVICE,
      MSG_TYPES.DEVICE + ', ' + MSG_TYPES.ERROR
    );

    this.deviceManager = deviceManager;
  }

  reply(deviceSpecs) {
    // Verify the device and act accordingly.
    if (!ClientManager.instance.verifyClient(deviceSpecs.clientId)) {
      let message = `There is no Client registered with ID "${deviceSpecs.clientId}"`;
      namida.logFailure(LOG_TAG, message);

      return {
        error: {
          title: LOG_TAG,
          message: message
        }
      };
    }

    // Process the registration of the sepcified device at the device manager
    let device = undefined;
    try {
      device = this.deviceManager.registerDeviceSpecs(deviceSpecs);
    } catch (error) {
      console.error(error);
      return {
        error: {
          title: LOG_TAG,
          message: error && error.toString(),
          stack: error.stack && error.stack.toString()
        }
      };
    }

    if (device !== undefined) {
      let specs = device.toProtobuf();
      return { device: specs };
    } else {
      return {
        error: {
          title: LOG_TAG,
          message: 'device manager returned undefined'
        }
      };
    }
  }
}

module.exports = {
  DeviceRegistrationService: DeviceRegistrationService
};
