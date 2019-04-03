const {
  Service
} = require('./service.js');

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class ClientRegistrationService extends Service {
  constructor(clientManager) {
    super(DEFAULT_TOPICS.SERVICES.CLIENT_REGISTRATION);

    this.clientManager = clientManager;
  }

  reply(message) {
    // Prepare the context.
    let context = this.prepareContext();

    // Process the registration of the sepcified client at the client manager
    let client = this.clientManager.processClientRegistration(message, context);

    if (context.success) {
      return {client: client.toProtobuf()};
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
  'ClientRegistrationService': ClientRegistrationService,
};