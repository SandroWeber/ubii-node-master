const {
  clientStateEnum,
  Client
} = require('./client.js');
const namida = require('@tum-far/namida');
const uuidv4 = require("uuid/v4");

const REJECT_REGISTRATION_FEEDBACK_TITLE = 'Client registration rejected';
const ACCEPT_REGISTRATION_FEEDBACK_TITLE = 'Client registration accepted';

class ClientManager {
  constructor(server) {
    this.server = server;
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
    this.clients.set(client.identifier, client);
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
   * Create a new client universally unique identifier (client UUID).
   * @returns {String} The newly created universally unique identifier (client UUID).
   */
  createClientUuid() {
    return uuidv4();
  }

  /**
   * Create a new client specification with the specified parameters.
   * @param {String} identifier Universally unique identifier of a Client.
   * @param {String} name Display name of the client.
   * @param {String} namespace Namespace of the client.
   * @param {String} targetHost Target host of the client connection.
   * @param {String} targetPort Target port of the client connection.
   */
  createClientSpecification(name, namespace, identifier) {
    return {
      name: name,
      namespace: namespace,
      id: identifier
    };
  }

  /**
   * Create a new client specification with the passed parameters and a new Universally Unique Identifier (UUID) as id.
   * @param {*} name Display name of the client.
   * @param {*} namespace
   * @param {*} targetHost Target host of the client connection.
   * @param {*} targetPort Target port of the client connection.
   */
  createClientSpecificationWithNewUuid(name, namespace) {
    return this.createClientSpecification(
      name,
      namespace,
      this.createClientUuid(namespace).toString());
  }

  /**
   * Process the registration of the specified client at the client manager.
   * @param {Object} clientSpecification
   * @param {*} context Context for the feedback.
   * @returns Returns the payload of the process result. This can be the client specification or an error.
   */
  processClientRegistration(clientSpecification, context) {
    // Prepare some variables.
    let payload = {};
    let currentClient = {};
    let clientIdentifier = clientSpecification.id;

    // Check the context
    if (context.feedback === undefined) {
      context.feedback = {};
    }

    // Update the feedback to the default registartion feedback.
    context.feedback.message = `New Client with id ${namida.style.messageHighlight(clientIdentifier)} registered.`;
    context.feedback.title = ACCEPT_REGISTRATION_FEEDBACK_TITLE;

    // Check if a client with the specified id is already registered...
    if (this.hasClient(clientIdentifier)) {
      // ... if so, check the state of the registered client if reregistering is possible.
      if (this.getClient(clientIdentifier).getState() === clientStateEnum.active) {
        // => REregistering is not an option: Reject the registration.

        // Update the context feedback.
        context.feedback.message = `Client with id ${namida.style.messageHighlight(clientIdentifier)} ` +
          `is already registered and active.`;
        context.feedback.title = REJECT_REGISTRATION_FEEDBACK_TITLE;

        // Ouput the feedback on the server console.
        namida.logFailure(context.feedback.title, context.feedback.message);

        // Return an error message payload.
        payload = {
          error: {
            title: context.feedback.title,
            message: context.feedback.message,
            stack: context.feedback.stack
          }
        };
        return payload
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

        // Continue with the normal registration process...
      }
    }
    // Normal registration steps:

    // Create a new client based on the client specification and register it.
    currentClient = new Client(clientSpecification.id,
      clientSpecification.name,
      clientSpecification.namespace,
      this.server);
    this.registerClient(currentClient);

    // Ouput the feedback on the server console.
    namida.logSuccess(context.feedback.title, context.feedback.message);

    // Update the client information.
    currentClient.updateInformation();

    // Return the clientSpecification payload
    payload = {
      clientSpecification: clientSpecification
    };
    return payload;
  }
}

module.exports = {
  'ClientManager': ClientManager
}