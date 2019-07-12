const {
  Service
} = require('../service.js');
const namida = require("@tum-far/namida");

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class DeviceRegistrationService extends Service {
  constructor(clientManager, deviceManager) {
    super(DEFAULT_TOPICS.SERVICES.DEVICE_REGISTRATION);

    this.clientManager = clientManager;
    this.deviceManager = deviceManager;
  }

  reply(message) {
    let context = this.prepareContext();
    context.success = false;

    // Verify the device and act accordingly.
    if (!this.clientManager.verifyClient(message.clientId)) {
      // Prepare the context.
      // Update the context feedback.
      context.feedback.message = `There is no Client registered with the id ${namida.style.messageHighlight(message.clientId)}. ` +
        `Message processing was aborted due to an unregistered client.`;
      context.feedback.title = 'DeviceRegistrationService ERROR';

      namida.logFailure(context.feedback.title, context.feedback.message);

      return {
        error: {
          title: context.feedback.title,
          message: context.feedback.message,
          stack: context.feedback.stack
        }
      };
    }

    // Process the registration of the sepcified device at the device manager
    let device = undefined;
    try {
      device = this.deviceManager.processDeviceRegistration(message, context);
    } catch (error) {
      return {
        error: {
          title: 'DeviceRegistrationService ERROR',
          message: error && error.toString(),
          stack: error.stack && error.stack.toString()
        }
      };
    }

    if (context.success && device !== undefined) {
      return { device: device.toProtobuf() };
    } else {
      return {
        error: {
          title: context.feedback.title,
          message: context.feedback.message,
          stack: context.feedback.stack
        }
      };
    }
  }
}

module.exports = {
  'DeviceRegistrationService': DeviceRegistrationService,
};