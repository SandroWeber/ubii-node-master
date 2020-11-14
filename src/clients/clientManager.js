const { clientStateEnum, Client } = require('./client.js');
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
    this.clients.set(client.id, client);
  }

  reconnectClient(clientSpecs) {}

  /**
   * Remove the specified Client from the clients map.
   * @param {String} id Universally unique identifier of a Client.
   */
  removeClient(id) {
    let client = this.clients.get(id);
    client.devices.forEach(device => {});
    client.deactivate();
    this.clients.delete(id);
  }

  setClientInactive(id) {
    let client = this.clients.get(id);
    if (client) {
      client.setState(clientStateEnum.inactive);
      console.info('client ' + id + ' set inactive');
    }
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
  processClientRegistration(clientSpecification) {
    // Prepare some variables.
    let clientIdentifier = clientSpecification.id;

    // Check if a client with the specified id is already registered...
    if (clientIdentifier && this.hasClient(clientIdentifier)) {
      // ... if so, check the state of the registered client if reregistering is possible.
      if (this.getClient(clientIdentifier).getState() === clientStateEnum.active) {
        // => Re-registering is NOT an option: Reject the registration.
        let errorMessage =
          'Client with ID ' + clientIdentifier + ' is already registered and active';

        // Ouput the feedback on the server console.
        namida.logFailure('ClientManager', errorMessage);

        throw new Error(errorMessage);
      } else if (this.getClient(clientIdentifier).name === clientSpecification.name) {
        // => Re-registering is possible: Prepare the registration.

        // Update the context feedback.
        let errorMessage =
          'Reregistration of Client with ID ' +
          clientIdentifier +
          ' initialized because it is already registered but in standby or inactive.';

        // Ouput the feedback on the server console.
        namida.logWarn('ClientManager', errorMessage);

        // Prepare the reregistration.
        this.clients.delete(clientIdentifier);

        // Continue with the normal registration process...
      }
    }
    // No client ID, normal registration steps:

    // Create a new client based on the client specification and register it.
    let currentClient = new Client(clientSpecification, this.server, this.topicData);
    this.registerClient(currentClient);

    // Update the client information.
    currentClient.updateInformation();

    // Ouput the feedback on the server console.
    namida.logSuccess('ClientManager', 'New Client with ID ' + currentClient.id + ' registered');

    // Return the client
    return currentClient;
  }
}

module.exports = {
  ClientManager: ClientManager
};
