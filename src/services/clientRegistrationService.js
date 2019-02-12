const {
  Service
} = require('./service.js');
const namida = require("@tum-far/namida");

class ClientRegistrationService extends Service {
  constructor(clientManager, targetHost, targetPortZMQ, targetPortWS) {
    super('/services/client_registration');

    this.targetHost = targetHost;
    this.targetPortZMQ = targetPortZMQ;
    this.targetPortWS = targetPortWS;
    this.clientManager = clientManager;
  }

  reply(message) {
    // Prepare the context.
    let context = this.prepareContext();

    // Create a new client specification.
    let clientSpecification = this.clientManager.createClientSpecificationWithNewUuid(
      message.name,
      message.namespace,
      this.targetHost,
      this.targetPortZMQ,
      this.targetPortWS
    );

    // Process the registration of the sepcified client at the client manager and return the result
    return this.clientManager.processClientRegistration(clientSpecification, context);
  }
}

module.exports = {
  'ClientRegistrationService': ClientRegistrationService,
};