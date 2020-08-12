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
    let context = this.prepareContext();
    context.success = false;

    // Verify the device and act accordingly.
    if (!this.clientManager.verifyClient(message.clientId)) {
      // Prepare the context.
      // Update the context feedback.
      context.feedback.message =
        `There is no Client registered with the id ${namida.style.messageHighlight(
          message.clientId
        )}. ` + `Message processing was aborted due to an unregistered client.`;
      context.feedback.title = 'DeviceDeregistrationService ERROR';

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
    try {
      this.deviceManager.removeDevice(message.id);

      namida.logSuccess('DeviceDeregistrationService', 'successfully removed device ' + message.id);

      return {
        success: {
          title: 'DeviceDeregistrationService SUCCESS',
          message: 'Device with ID ' + message.id + ' successfully removed.'
        }
      };
    } catch (error) {
      return {
        error: {
          title: 'DeviceDeregistrationService ERROR',
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
