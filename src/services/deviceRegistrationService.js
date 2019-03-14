const {
  Service
} = require('./service.js');
const namida = require("@tum-far/namida");

const { ProtobufTranslator, MSG_TYPES, DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class DeviceRegistrationService extends Service {
  constructor(clientManager, deviceManager) {
    super(DEFAULT_TOPICS.SERVICES.DEVICE_REGISTRATION);

    this.clientManager = clientManager;
    this.deviceManager = deviceManager;

    this.serviceReplyTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REPLY);
  }

  reply(message) {
    let context = this.prepareContext();

    // Verify the device and act accordingly.
    if (!this.clientManager.verifyClient(message.clientId)) {
      // Prepare the context.
      // Update the context feedback.
      context.feedback.message = `There is no Client registered with the id ${namida.style.messageHighlight(message.clientId)}. ` +
        `Message processing was aborted due to an unregistered client.`;
      context.feedback.title = 'Message processing aborted';

      namida.logFailure(context.feedback.title, context.feedback.message);

      return this.serviceReplyTranslator.createMessageFromPayload({
        error: {
          title: context.feedback.title,
          message: context.feedback.message,
          stack: context.feedback.stack
        }
      });
    }

    // Process the registration of the sepcified device at the device manager and return the result
    return {device: this.deviceManager.processDeviceRegistration(message, context).toProtobuf()};
  }
}

module.exports = {
  'DeviceRegistrationService': DeviceRegistrationService,
};