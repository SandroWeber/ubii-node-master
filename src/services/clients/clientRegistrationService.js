const { Service } = require('../service.js');

const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class ClientRegistrationService extends Service {
  constructor(clientManager) {
    super(
      DEFAULT_TOPICS.SERVICES.CLIENT_REGISTRATION,
      MSG_TYPES.CLIENT,
      MSG_TYPES.CLIENT + ', ' + MSG_TYPES.ERROR
    );

    this.clientManager = clientManager;
  }

  reply(message) {
    let client = undefined;
    // Process the registration of the sepcified client at the client manager
    try {
      client = this.clientManager.processClientRegistration(message);
    } catch (error) {
      return {
        error: {
          title: 'ClientRegistrationService',
          message: error && error.toString(),
          stack: error && error.stack && error.stack.toString()
        }
      };
    }

    if (client) {
      return { client: client.toProtobuf() };
    } else {
      return {
        error: {
          title: 'ClientRegistrationService',
          message: 'client manager returned undefined'
        }
      };
    }
  }
}

module.exports = {
  ClientRegistrationService: ClientRegistrationService
};
