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
    let client = this.clientManager.getClient(message.id);
    let clientString = client.toString();
    // Process the registration of the sepcified client at the client manager
    try {
      this.deviceManager.removeClientDevices(client.id);
      this.clientManager.removeClient(client.id);
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

    let msgSuccess = {
      title: 'ClientDeregistrationService',
      message: clientString + ' was successfully removed'
    }

    namida.logSuccess(msgSuccess.title, msgSuccess.message);
    return {
      success: msgSuccess
    };
  }
}

module.exports = {
  ClientDeregistrationService: ClientDeregistrationService
};
