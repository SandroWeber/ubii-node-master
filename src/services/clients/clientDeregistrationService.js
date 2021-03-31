const { Service } = require('../service.js');
const namida = require('@tum-far/namida');

const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class ClientDeregistrationService extends Service {
  constructor(clientManager, deviceManager) {
    super(
      DEFAULT_TOPICS.SERVICES.CLIENT_DEREGISTRATION,
      MSG_TYPES.CLIENT,
      MSG_TYPES.SUCCESS + ', ' + MSG_TYPES.ERROR
    );

    this.clientManager = clientManager;
    this.deviceManager = deviceManager;
  }

  reply(message) {
    // Process the registration of the sepcified client at the client manager
    let clientString = this.clientManager.getClient(message.id).toString();
    try {
      this.deviceManager.removeClientDevices(message.id);
      this.clientManager.removeClient(message.id);
    } catch (error) {
      namida.logFailure('ClientDeregistrationService ERROR', error.toString());
      return {
        error: {
          title: 'ClientDeregistrationService ERROR',
          message: error && error.toString(),
          stack: error && error.stack
        }
      };
    }

    namida.logSuccess(
      'ClientDeregistrationService SUCCESS',
      clientString + ' successfully unregistered'
    );

    return {
      success: {
        title: 'ClientDeregistrationService SUCCESS',
        message: clientString + ' was successfully unregistered'
      }
    };
  }
}

module.exports = {
  ClientDeregistrationService: ClientDeregistrationService
};
