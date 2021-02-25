const { Service } = require('../service.js');
const namida = require('@tum-far/namida');

const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const client = require('../../clients/client.js');

class ClientListService extends Service {
  constructor(clientManager) {
    super(
      DEFAULT_TOPICS.SERVICES.CLIENT_GET_LIST,
      undefined,
      MSG_TYPES.CLIENT_LIST + ', ' + MSG_TYPES.ERROR
    );

    this.clientManager = clientManager;
  }

  reply() {
    let clientList = this.clientManager.getClientList();
    let response = {
      elements: []
    };
    clientList.forEach(client => {
      response.elements.push(client.toProtobuf());
    });

    return response;
  }
}

module.exports = {
  ClientListService
};
