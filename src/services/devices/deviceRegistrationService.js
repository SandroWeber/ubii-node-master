const { Service } = require('../service.js');
const namida = require('@tum-far/namida');

const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class DeviceRegistrationService extends Service {
  constructor(clientManager, deviceManager) {
    super(
      DEFAULT_TOPICS.SERVICES.DEVICE_REGISTRATION,
      MSG_TYPES.DEVICE,
      MSG_TYPES.DEVICE + ', ' + MSG_TYPES.ERROR
    );

    this.clientManager = clientManager;
    this.deviceManager = deviceManager;
  }

  reply(message) {
    // Verify the device and act accordingly.
    if (!this.clientManager.verifyClient(message.clientId)) {
      let message = 'There is no Client registered with the ID ' + message.clientId;

      namida.logFailure('DeviceRegistrationService', message);

      return {
        error: {
          title: 'DeviceRegistrationService ERROR',
          message: message
        }
      };
    }

    // Process the registration of the sepcified device at the device manager
    let device = undefined;
    try {
      device = this.deviceManager.registerDeviceSpecs(message);
    } catch (error) {
      namida.logFailure('DeviceRegistrationService', error.toString());
      return {
        error: {
          title: 'DeviceRegistrationService ERROR',
          message: error && error.toString(),
          stack: error.stack && error.stack.toString()
        }
      };
    }

    if (device !== undefined) {
      return { device: device.toProtobuf() };
    } else {
      return {
        error: {
          title: 'DeviceRegistrationService ERROR',
          message: 'device manager returned undefined'
        }
      };
    }
  }
}

module.exports = {
  DeviceRegistrationService: DeviceRegistrationService
};
