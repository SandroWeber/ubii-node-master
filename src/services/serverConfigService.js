const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('./service.js');
const configService = require('../config/configService');

class ServerConfigService extends Service {
  constructor(id, name, connectionManager) {
    super(DEFAULT_TOPICS.SERVICES.SERVER_CONFIG);

    this.id = id;
    this.name = name;
    this.connectionManager = connectionManager;
  }

  reply() {
    let constants = {
      DEFAULT_TOPICS: DEFAULT_TOPICS,
      MSG_TYPES: MSG_TYPES
    };

    return {
      server: {
        id: this.id,
        name: this.name,
        ipEthernet: this.connectionManager.hostAdresses.ethernet.toString(),
        ipWlan: this.connectionManager.hostAdresses.wlan.toString(),
        portServiceZmq: configService.getPortServiceZMQ().toString(),
        portServiceRest: configService.getPortServiceREST().toString(),
        portTopicDataZmq: configService.getPortTopicdataZMQ().toString(),
        portTopicDataWs: configService.getPortTopicdataWS().toString(),
        constantsJson: JSON.stringify(constants)
      }
    };
  }
}

module.exports = {
  ServerConfigService: ServerConfigService
};
