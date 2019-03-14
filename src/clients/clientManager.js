const {
  clientStateEnum,
  Client
} = require('./client.js');
const namida = require('@tum-far/namida');
const uuidv4 = require('uuid/v4');

const REJECT_REGISTRATION_FEEDBACK_TITLE = 'Client registration rejected';
const ACCEPT_REGISTRATION_FEEDBACK_TITLE = 'Client registration accepted';

class ClientManager {
  constructor(server, topicData) {
    this.server = server;
    this.topicData = topicData;
    this.clients = new Map();

    namida.log('Client Manager Ready', 'The Client Manager is initialized and ready to work.');
  }

  /**
   * Get the Client with the specified identifier.
   * @param {String} clientIdentifier Universally unique identifier of a Client.
   * @returns Client object with the specified identifier.
   */
  getClient(clientIdentifier) {
    return this.clients.get(clientIdentifier);
  }

  /**
   * Is there a client with the specified identifier in the clients map?
   * @param {String} clientIdentifier Universally unique identifier of a Client.
   * @returns Boolean indicating if there is a client with the specified identifier.
   */
  hasClient(clientIdentifier) {
    return this.clients.has(clientIdentifier);
  }

  /**
   * Add the referred Client to the clients map.
   * @param {Object} client Client object.
   */
  addClient(client) {
    console.info('added client with ID ' + client.id);
    this.clients.set(client.id, client);
  }

  /**
   * Remove the specified Client from the clients map.
   * @param {String} clientIdentifier Universally unique identifier of a Client.
   */
  removeClient(clientIdentifier) {
    this.clients.get(clientIdentifier).deactivate();
    this.clients.delete(clientIdentifier);
  }

  /**
   * Register the referred client and initialize some client functionalities.
   * @param {Object} client Client object.
   */
  registerClient(client) {
    // Register the client.
    this.addClient(client);

    // Start the life monitoring.
    client.startLifeMonitoring();
  }

  /**
   * Verify the specified client.
   * @param {String} clientIdentifier Universally unique identifier of a Client.
   * @returns Returns true if the specified client is a verfied client, returns false otherwise.
   */
  verifyClient(clientIdentifier) {
    if (!this.hasClient(clientIdentifier)) {
      return false;
    } else {
      return true;
    }
  }

  /**
   * Process the registration of the specified client at the client manager.
   * @param {Object} clientSpecification
   * @param {*} context Context for the feedback.
   * @returns Returns the payload of the process result. This can be the client specification or an error.
   */
  processClientRegistration(clientSpecification, context) {
    // Prepare some variables.
    let currentClient = {};
    let clientIdentifier = clientSpecification.id;

    // Check the context
    if (context.feedback === undefined) {
      context.feedback = {};
    }

    // Check if a client with the specified id is already registered...
    if (this.hasClient(clientIdentifier)) {
      // ... if so, check the state of the registered client if reregistering is possible.
      if (this.getClient(clientIdentifier).getState() === clientStateEnum.active) {
        // => REregistering is not an option: Reject the registration.

        // Update the context feedback.
        context.feedback.message = `Client with id ${namida.style.messageHighlight(clientIdentifier)} ` +
          `is already registered and active.`;
        context.feedback.title = REJECT_REGISTRATION_FEEDBACK_TITLE;
        context.success = false;

        // Ouput the feedback on the server console.
        namida.logFailure(context.feedback.title, context.feedback.message);

        return undefined;
      } else {
        // => REregistering is possible: Prepare the registration.

        // Update the context feedback.
        context.feedback.message = `Reregistration of Client with id ${namida.style.messageHighlight(clientIdentifier)} ` +
          `initialized because it is already registered but in standby or inactive.`;
        context.feedback.title = ACCEPT_REGISTRATION_FEEDBACK_TITLE;

        // Ouput the feedback on the server console.
        namida.logWarn(context.feedback.title, context.feedback.message);

        // Prepare the reregistration.
        this.removeClient(clientIdentifier);

        // Update the feedback.
        context.feedback.message = `Client with id ${namida.style.messageHighlight(clientIdentifier)} reregistered.`;
        context.feedback.title = ACCEPT_REGISTRATION_FEEDBACK_TITLE;
        context.success = true;

        // Continue with the normal registration process...
      }
    }
    // Normal registration steps:

    // Create a new client based on the client specification and register it.
    currentClient = new Client(clientSpecification, this.server, this.topicData);
    this.registerClient(currentClient);

    // Update the client information.
    currentClient.updateInformation();

    // Update the feedback to the default registartion feedback.
    context.feedback.message = `New Client with id ${namida.style.messageHighlight(clientIdentifier)} registered.`;
    context.feedback.title = ACCEPT_REGISTRATION_FEEDBACK_TITLE;
    context.success = true;
    // Ouput the feedback on the server console.
    namida.logSuccess(context.feedback.title, context.feedback.message);

    // Return the clientSpecification payload
    return currentClient;
  }
}

module.exports = {
  'ClientManager': ClientManager
};