const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('./service.js');
const configService = require('../config/configService');
const NetworkConfigManager = require('../network/networkConfigManager');

class ServerConfigService extends Service {
  constructor(id, name) {
    super(DEFAULT_TOPICS.SERVICES.SERVER_CONFIG, undefined, MSG_TYPES.SERVER);

    this.id = id;
    this.name = name;
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
        ipEthernet: NetworkConfigManager.hostAdresses.ethernet.toString(),
        ipWlan: NetworkConfigManager.hostAdresses.wifi.toString(),
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
