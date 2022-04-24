const { Service } = require('../service.js');
const namida = require('@tum-far/namida');

const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const client = require('../../clients/client.js');

class ClientListService extends Service {
  constructor(clientManager) {
    super(DEFAULT_TOPICS.SERVICES.CLIENT_GET_LIST, undefined, MSG_TYPES.CLIENT_LIST + ', ' + MSG_TYPES.ERROR);

    this.clientManager = clientManager;
  }

  reply(request) {
    let clientList = this.clientManager.getClientList().map((client) => client.toProtobuf());
    
    let responseList = [];
    if (!request || !request.elements || request.elements.length === 0) {
      responseList = clientList;
    } else {
      responseList = this.filterClients(request.elements, clientList);
    }
    let response = {
      clientList: {
        elements: responseList
      }
    };

    return response;
  }

  filterClients(requestedClients, availableClients) {
    let responseList = [];

    requestedClients.forEach((clientRequestAlternative) => {
      let filteredClients = availableClients;
      if (clientRequestAlternative.id) {
        filteredClients = filteredClients.filter((client) => client.id === clientRequestAlternative.id);
      }
      if (clientRequestAlternative.name) {
        filteredClients = filteredClients.filter((client) => client.name === clientRequestAlternative.name);
      }
      if (clientRequestAlternative.tags) {
        filteredClients = filteredClients.filter((client) =>
          clientRequestAlternative.tags.every((requestTag) => client.tags.includes(requestTag))
        );
      }
      if (clientRequestAlternative.state) {
        filteredClients = filteredClients.filter((client) => client.state === clientRequestAlternative.state);
      }
      if (clientRequestAlternative.latency) {
        filteredClients = filteredClients.filter((client) => client.latency <= clientRequestAlternative.latency);
      }
      //TODO: filter by devices/components, re-use functionality between device services and here
      responseList = responseList.concat(filteredClients);
    });

    return responseList;
  }

  filterClientsByDevices(clients, requestedDevices) {
    clients.filter(client => {
      client.devices.forEach(device => {

      })
    });
  }
}

module.exports = {
  ClientListService
};
