const namida = require('@tum-far/namida');
const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../service.js');

const { ClientManager } = require('../../clients/clientManager.js');

class DeviceRegistrationService extends Service {
  constructor(deviceManager) {
    super(
      DEFAULT_TOPICS.SERVICES.DEVICE_REGISTRATION,
      MSG_TYPES.DEVICE,
      MSG_TYPES.DEVICE + ', ' + MSG_TYPES.ERROR
    );

    this.deviceManager = deviceManager;
  }

  reply(request) {
    console.info(request);
    // Verify the device and act accordingly.
    if (!ClientManager.instance.verifyClient(request.clientId)) {
      let message = 'There is no Client registered with the ID ' + request.clientId;

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
      device = this.deviceManager.registerDeviceSpecs(request);
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
      let specs = device.toProtobuf();
      return { device: specs };
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
