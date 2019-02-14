const RESTServer = require('./restServer');
const WebsocketServer = require('./websocketServer');

const { ProtobufTranslator, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class ServerNodeWeb {
  constructor(portServices,
              portTopicData,
              autoStart = true) {
    // Properties:
    this.ports = {
      services: portServices,
      topicData: portTopicData
    };

    // Translators:
    this.translatorServiceReply = new ProtobufTranslator(MSG_TYPES.SERVICE_REPLY);
    this.translatorServiceRequest = new ProtobufTranslator(MSG_TYPES.SERVICE_REQUEST);
    this.translatorTopicData = new ProtobufTranslator(MSG_TYPES.TOPIC_DATA);

    // Cache for specifications:
    this.deviceSpecifications = new Map();

    if (autoStart) {
      this.start();
    }
  }

  start() {
    this.connections = {};

    // REST Service Server Component:
    this.connections.services = new RESTServer(
      this.ports.services,
      true
    );
    // Websocket Topic Data Server Component:
    this.connections.topicData = new WebsocketServer(
      this.ports.topicData
    );
  }

  onServiceMessageReceived(serviceRoute, callback) {
    this.connections.services.setRoutePOST(serviceRoute, callback);
  }

  onTopicDataMessageReceived(callback) {
    this.connections.topicData.onMessageReceived(callback);
  }

}

module.exports = {
  ServerNodeWeb: ServerNodeWeb,
};