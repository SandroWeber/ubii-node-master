const { CLIENT_STATE, Client } = require('./client.js');
const namida = require('@tum-far/namida');

let _instance = null;
const SINGLETON_ENFORCER = Symbol();

class ClientManager {
  constructor(enforcer) {
    if (enforcer !== SINGLETON_ENFORCER) {
      throw new Error('Use ' + this.constructor.name + '.instance');
    }

    this.clients = new Map();
  }

  static get instance() {
    if (_instance == null) {
      _instance = new ClientManager(SINGLETON_ENFORCER);
    }

    return _instance;
  }

  /**
   * Set the connections manager and topicdata buffer dependencies.
   * @param {NetworkConnectionsManager} connections
   * @param {RuntimeTopicData} topicdata 
   */
  setDependencies(connections, topicdata) {
    this.server = connections;
    this.topicData = topicdata;
  }

  /**
   * Get the Client with the specified identifier.
   * @param {String} id Universally unique identifier of a Client.
   * @returns Client object with the specified identifier.
   */
  getClient(id) {
    return this.clients.get(id);
  }

  /**
   * Get a list of all clients.
   * @returns {Array} client list
   */
  getClientList() {
    return Array.from(this.clients).map((pairKeyValue) => pairKeyValue[1]);
  }

  /**
   * Is there a client with the specified identifier in the clients map?
   * @param {String} id Universally unique identifier of a Client.
   * @returns Boolean indicating if there is a client with the specified identifier.
   */
  hasClient(id) {
    return this.clients.has(id);
  }

  /**
   * Add the referred Client to the clients map.
   * @param {Object} client Client object.
   */
  addClient(client) {
    this.clients.set(client.id, client);
  }

  reconnectClient(clientSpecs) {
    //TODO: implement
  }

  /**
   * Remove the specified Client from the clients map.
   * @param {String} id Universally unique identifier of a Client.
   */
  removeClient(id) {
    let client = this.clients.get(id);
    client.deactivate();
    this.clients.delete(id);
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
   * @param {String} id Universally unique identifier of a Client.
   * @returns Returns true if the specified client is a verfied client, returns false otherwise.
   */
  verifyClient(id) {
    if (!this.hasClient(id)) {
      return false;
    } else {
      return true;
    }
  }

  /**
   * Process the registration of the specified client at the client manager.
   * @param {Object} spec - client specification
   * @param {*} context Context for the feedback.
   * @returns Returns the payload of the process result. This can be the client specification or an error.
   */
  processClientRegistration(spec) {
    // Check if a client with the specified id is already registered...
    if (spec.id && this.hasClient(spec.id)) {
      // ... if so, check the state of the registered client if reregistering is possible.
      if (this.getClient(spec.id).getState() === CLIENT_STATE.active) {
        // => Re-registering is NOT an option: Reject the registration.
        let errorMessage = 'Client with ID ' + spec.id + ' is already registered and active';

        // Ouput the feedback on the server console.
        namida.logFailure('ClientManager', errorMessage);

        throw new Error(errorMessage);
      } else if (this.getClient(spec.id).name === spec.name) {
        // => Re-registering is possible: Prepare the registration.

        // Update the context feedback.
        let warnMessage =
          'Reregistration of Client with ID ' +
          spec.id +
          ' initialized because it is already registered but in standby or inactive.';

        // Ouput the feedback on the server console.
        namida.logWarn('ClientManager', warnMessage);

        // Prepare the reregistration.
        this.clients.delete(spec.id);

        // Continue with the normal registration process...
      }
    }
    // No client ID, normal registration steps:

    // Create a new client based on the client specification and register it.
    let currentClient = new Client(spec, this.server, this.topicData);
    this.registerClient(currentClient);

    // Update the client information.
    currentClient.updateInformation();

    // Ouput the feedback on the server console.
    namida.logSuccess('ClientManager', 'New ' + currentClient.toString() + ' registered');

    // Return the client
    return currentClient;
  }

  getNodeIDsForProcessingModule(pmSpec) {
    let nodeIDs = [];
    this.clients.forEach((client) => {
      if (
        client.isDedicatedProcessingNode &&
        client.getState() === CLIENT_STATE.active &&
        client.processingModules.some((pm) => (pm.name = pmSpec.name))
      ) {
        nodeIDs.push(client.id);
      }
    });

    return nodeIDs;
  }
}

module.exports = {
  ClientManager: ClientManager
};
