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

    // Create a new client specification.
    let clientSpecification = this.clientManager.createClientSpecificationWithNewUuid(
      message.name,
      message.namespace
    );

    // Process the registration of the sepcified client at the client manager and return the result
    return this.clientManager.processClientRegistration(clientSpecification, context);
  }
}

module.exports = {
  'ClientRegistrationService': ClientRegistrationService,
};