const RESTServer = require('./restServer');
const WebsocketServer = require('./websocketServer');

const { ProtobufTranslator } = require('@tum-far/ubii-msg-formats');

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
    //TODO: define message format constants in ubii-msg-formats
    this.msgTypeServiceReply = 'ubii.service.ServiceReply';
    this.msgTypeServiceRequest = 'ubii.service.ServiceRequest';
    this.msgTypeTopicData = 'ubii.topicData.TopicData';
    this.translatorServiceReply = new ProtobufTranslator(this.msgTypeServiceReply);
    this.translatorServiceRequest = new ProtobufTranslator(this.msgTypeServiceRequest);
    this.translatorTopicData = new ProtobufTranslator(this.msgTypeTopicData);

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