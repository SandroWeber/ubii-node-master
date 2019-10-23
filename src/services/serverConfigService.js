const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

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
    return {
      server: {
        id: this.id,
        name: this.name,
        ipEthernet: this.connectionManager.hostAdresses.ethernet.toString(),
        ipWlan: this.connectionManager.hostAdresses.wlan.toString(),
        portServiceZmq: configService.getPortServiceZMQ().toString(),
        portServiceRest: configService.getPortServiceREST().toString(),
        portTopicDataZmq: configService.getPortTopicdataZMQ().toString(),
        portTopicDataWs: configService.getPortTopicdataWS().toString()
      }
    };
  }
}

module.exports = {
  ServerConfigService: ServerConfigService
};
