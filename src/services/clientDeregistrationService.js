const {
  Service
} = require('./service.js');

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class ClientDeregistrationService extends Service {
  constructor(clientManager) {
    super(DEFAULT_TOPICS.SERVICES.CLIENT_DEREGISTRATION);

    this.clientManager = clientManager;
  }

  reply(message) {
    // Process the registration of the sepcified client at the client manager
    try {
      this.clientManager.removeClient(message.id);
    }
    catch (error) {
      return {
        error: {
          title: 'ClientDeregistrationService ERROR',
          message: error && error.toString(),
          stack: error && error.stack
        }
      };
    }

    return {
      success: {
        title: 'ClientDeregistrationService SUCCESS',
        message: 'Client with ID ' + message.id + ' was successfully removed'
      }
    }
  }
}

module.exports = {
  'ClientDeregistrationService': ClientDeregistrationService,
};