const { Service } = require('../service.js');
const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class NetworkInfoService extends Service {
    constructor(clientManager) {
        super(DEFAULT_TOPICS.SERVICES.LATENZ_CLIENTS_LIST, undefined, MSG_TYPES.CLIENT_LIST);
  
        this.clientManager = clientManager;
    }
  
    reply() {
      let clientList = this.clientManager.getClientList();
      let response = {
        clientList: {
          elements: []
        }
      };
      clientList.forEach(client => {
        response.clientList.elements.push(client.latenzToProtobuf());
      });

      return response;
    }
  }
  
  module.exports = {
    NetworkInfoService: NetworkInfoService
  };