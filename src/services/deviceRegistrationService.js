const {
  Service
} = require('./service.js');
const namida = require("@tum-far/namida");

class DeviceRegistrationService extends Service {
  constructor(clientManager, deviceManager) {
    super('deviceRegistration');

    this.clientManager = clientManager;
    this.deviceManager = deviceManager;
  }

  reply(message) {
    console.info(message);
    // Prepare the context.
    let context = this.prepareContext();

    // Extract the relevant information.
    let correspondingClientIdentifier = message.correspondingClientIdentifier;

    // Verify the device and act accordingly.
    if (!this.clientManager.verifyClient(correspondingClientIdentifier)) {
      // Update the context feedback.
      context.feedback.message = `There is no Client registered with the id ${namida.style.messageHighlight(correspondingClientIdentifier)}. ` +
        `Message processing was aborted due to an unregistered client.`;
      context.feedback.title = 'Message processing aborted';

      namida.logFailure(context.feedback.title, context.feedback.message);

      return this.serviceReplyTranslator.createBufferFromPayload({
        error: {
          title: context.feedback.title,
          message: context.feedback.message,
          stack: context.feedback.stack
        }
      });
    }

    // Create a new device specification.
    let deviceSpecification = this.deviceManager.createDeviceSpecificationWithNewUuid(
      message.name,
      message.namespace,
      message.deviceType,
      correspondingClientIdentifier,
    );

    // Process the registration of the sepcified device at the device manager and return the result
    return this.deviceManager.processDeviceRegistration(deviceSpecification, context);
  }
}

module.exports = {
  'DeviceRegistrationService': DeviceRegistrationService,
};