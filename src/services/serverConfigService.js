const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const NetworkConfigManager = require('@tum-far/ubii-node-nodejs/src/networking/networkConfigManager');
const ConfigService = require('@tum-far/ubii-node-nodejs/src/config/configService');
const namida = require('@tum-far/namida/src/namida');

const { Service } = require('./service.js');

class ServerConfigService extends Service {
  constructor(id, name, connectionManager) {
    super(DEFAULT_TOPICS.SERVICES.SERVER_CONFIG, undefined, MSG_TYPES.SERVER);

    this.id = id;
    this.name = name;
    this.connectionManager = connectionManager;

    this.defineEndpoints();
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
        constantsJson: JSON.stringify(constants),
        externalAddressServiceZmq: this.endpointServiceZmq,
        externalAddressServiceHttpJson: this.endpointServiceHttpJson,
        externalAddressServiceHttpBinary: this.endpointServiceHttpBinary,
        externalAddressTopicDataZmq: this.endpointTopicdataZmq,
        externalAddressTopicDataWs: this.endpointTopicdataWs
      }
    };
  }

  defineEndpoints() {
    let ipAddress = NetworkConfigManager.instance.hostAdresses.ethernet
      ? NetworkConfigManager.instance.hostAdresses.ethernet.toString()
      : NetworkConfigManager.instance.hostAdresses.wifi.toString();
    this.endpointServiceZmq =
      ConfigService.instance.externalEndpoints &&
      ConfigService.instance.externalEndpoints.serviceZmq &&
      ConfigService.instance.externalEndpoints.serviceZmq.length > 0
        ? ConfigService.instance.externalEndpoints.serviceZmq
        : ipAddress + ':' + ConfigService.instance.getPortServiceZMQ().toString();
    this.endpointServiceHttpJson =
      ConfigService.instance.externalEndpoints &&
      ConfigService.instance.externalEndpoints.serviceHttpJson &&
      ConfigService.instance.externalEndpoints.serviceHttpJson.length > 0
        ? ConfigService.instance.externalEndpoints.serviceHttpJson
        : ipAddress + ':' + ConfigService.instance.getPortServiceREST().toString() + '/services/json';
    this.endpointServiceHttpBinary =
      ConfigService.instance.externalEndpoints &&
      ConfigService.instance.externalEndpoints.serviceHttpBinary &&
      ConfigService.instance.externalEndpoints.serviceHttpBinary.length > 0
        ? ConfigService.instance.externalEndpoints.serviceHttpBinary
        : ipAddress + ':' + ConfigService.instance.getPortServiceREST().toString() + '/services/binary';
    this.endpointTopicdataZmq =
      ConfigService.instance.externalEndpoints &&
      ConfigService.instance.externalEndpoints.topicDataZmq &&
      ConfigService.instance.externalEndpoints.topicDataZmq.length > 0
        ? ConfigService.instance.externalEndpoints.topicDataZmq
        : ipAddress + ':' + ConfigService.instance.getPortTopicdataZMQ().toString();
    this.endpointTopicdataWs =
      ConfigService.instance.externalEndpoints &&
      ConfigService.instance.externalEndpoints.topicDataWs &&
      ConfigService.instance.externalEndpoints.topicDataWs.length > 0
        ? ConfigService.instance.externalEndpoints.topicDataWs
        : ipAddress + ':' + ConfigService.instance.getPortTopicdataWS().toString();

    this.logEndpointsStatus();
  }

  logEndpointsStatus() {
    let message = 'external communication endpoints:';

    message += '\n Service (HTTP, JSON): ' + this.endpointServiceHttpJson;
    message += '\n Service (HTTP, binary): ' + this.endpointServiceHttpBinary;
    message += '\n Service (ZMQ, binary): ' + this.endpointServiceZmq;
    message += '\n TopicData (WS, binary): ' + this.endpointTopicdataWs;
    message += '\n TopicData (ZMQ, binary): ' + this.endpointTopicdataZmq;

    namida.logSuccess('ServerConfigService', message);
  }
}

module.exports = {
  ServerConfigService: ServerConfigService
};
