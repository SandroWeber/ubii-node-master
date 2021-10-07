const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const NetworkConfigManager = require('@tum-far/ubii-node-nodejs/src/networking/networkConfigManager');
const ConfigService = require('@tum-far/ubii-node-nodejs/src/config/configService');

const { Service } = require('./service.js');

class ServerConfigService extends Service {
  constructor(id, name, connectionManager) {
    super(DEFAULT_TOPICS.SERVICES.SERVER_CONFIG, undefined, MSG_TYPES.SERVER);

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
        ipEthernet: NetworkConfigManager.instance.hostAdresses.ethernet.toString(),
        ipWlan: NetworkConfigManager.instance.hostAdresses.wifi.toString(),
        portServiceZmq: ConfigService.instance.getPortServiceZMQ().toString(),
        portServiceRest: ConfigService.instance.getPortServiceREST().toString(),
        portTopicDataZmq: ConfigService.instance.getPortTopicdataZMQ().toString(),
        portTopicDataWs: ConfigService.instance.getPortTopicdataWS().toString(),
        constantsJson: JSON.stringify(constants)
      }
    };
  }
}

module.exports = {
  ServerConfigService: ServerConfigService
};
