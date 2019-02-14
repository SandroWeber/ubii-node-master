const {Service} = require('./service.js');
const { ProtobufTranslator, MSG_TYPES, DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class ServerConfigService extends Service {
  constructor(id, name, host, connectionManager) {
    super(DEFAULT_TOPICS.SERVICES.SERVER_CONFIG);

    this.id = id;
    this.name = name;
    this.host = host;
    this.connectionManager = connectionManager;

    this.translatorServiceReply = new ProtobufTranslator(MSG_TYPES.SERVICE_REPLY);
  }

  reply() {
    return this.translatorServiceReply.createMessageFromPayload({
      serverSpecification: {
        id: this.id,
        name: this.name,
        ip: this.host,
        portServiceZmq: this.connectionManager.ports.serviceZMQ.toString(),
        portServiceRest: this.connectionManager.ports.serviceREST.toString(),
        portTopicDataZmq: this.connectionManager.ports.topicDataZMQ.toString(),
        portTopicDataWs: this.connectionManager.ports.topicDataWS.toString(),
      }
    });
  }
}

module.exports = {
  'ServerConfigService': ServerConfigService,
};