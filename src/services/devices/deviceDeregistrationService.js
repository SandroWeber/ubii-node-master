const { Service } = require('../service.js');
const namida = require('@tum-far/namida');

const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class DeviceDeregistrationService extends Service {
  constructor(clientManager, deviceManager) {
    super(
      DEFAULT_TOPICS.SERVICES.DEVICE_DEREGISTRATION,
      MSG_TYPES.DEVICE,
      MSG_TYPES.SUCCESS + ', ' + MSG_TYPES.ERROR
    );

    this.clientManager = clientManager;
    this.deviceManager = deviceManager;
  }

  reply(message) {
    // Verify the device and act accordingly.
    if (!this.clientManager.verifyClient(message.clientId)) {
      let errorTitle = 'DeviceDeregistrationService';
      let errorMessage = 'There is no Client registered with the ID ' + message.clientId;

      namida.logFailure(errorTitle, errorMessage);

      return {
        error: {
          title: errorTitle,
          message: errorMessage
        }
      };
    }

    // Process the registration of the sepcified device at the device manager
    try {
      this.deviceManager.removeDevice(message.id);

      namida.logSuccess('DeviceDeregistrationService', 'successfully removed device ' + message.id);

      return {
        success: {
          title: 'DeviceDeregistrationService',
          message: 'Device with ID ' + message.id + ' successfully removed.'
        }
      };
    } catch (error) {
      return {
        error: {
          title: 'DeviceDeregistrationService',
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
