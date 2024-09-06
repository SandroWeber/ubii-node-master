const { Service } = require('../service.js');
const namida = require('@tum-far/namida');

const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const client = require('../../clients/client.js');
const FilterUtils = require('../../utils/filterUtils');

class ClientListService extends Service {
  constructor(clientManager) {
    super(
      DEFAULT_TOPICS.SERVICES.CLIENT_GET_LIST,
      MSG_TYPES.CLIENT_LIST,
      MSG_TYPES.CLIENT_LIST + ', ' + MSG_TYPES.ERROR
    );

    this.clientManager = clientManager;
  }

  reply(request) {
    let clientList = this.clientManager.getClientList().map((client) => client.toProtobuf());

    if (request && request.elements) {
      clientList = FilterUtils.filterAll(request.elements, clientList);
    }

    let response = {
      clientList: {
        elements: clientList
      }
    };
    return response;
  }
}

module.exports = {
  ClientListService
};
