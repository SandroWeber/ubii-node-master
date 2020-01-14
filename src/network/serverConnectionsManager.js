const { ProtobufTranslator, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const ZmqReply = require('./zmqReply');
const ZmqRouter = require('./zmqRouter');

const WebsocketServer = require('./websocketServer');
const RESTServer = require('./restServer');

const configService = require('../config/configService');

class ServerConnectionsManager {
  constructor() {
    // Translators:
    this.serviceReplyTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REPLY);
    this.serviceRequestTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REQUEST);
    this.topicDataTranslator = new ProtobufTranslator(MSG_TYPES.TOPIC_DATA);

    this.openConnections();
  }

  openConnections() {
    this.connections = {};

    // ZMQ Service Server Component:
    this.connections.serviceZMQ = new ZmqReply(
      configService.getPortServiceZMQ(),
      message => {},
      true
    );

    // REST Service Server Component:
    this.connections.serviceREST = new RESTServer(
      configService.getPortServiceREST(),
      configService.useHTTPS()
    );

    // ZMQ Topic Data Server Component:
    this.connections.topicDataZMQ = new ZmqRouter(
      'server_zmq',
      configService.getPortTopicdataZMQ(),
      (envelope, message) => {}
    );

    // Websocket Topic Data Server Component:
    this.connections.topicDataWS = new WebsocketServer(
      configService.getPortTopicdataWS(),
      configService.useHTTPS()
    );
  }

  onServiceMessageZMQ(callback) {
    this.connections.serviceZMQ.onReceive = callback;
  }

  onServiceMessageREST(callback) {
    this.connections.serviceREST.setRoutePOST('/services', (request, response) => {
      callback(request, response);
    });
  }

  onTopicDataMessageZMQ(callback) {
    this.connections.topicDataZMQ.onReceive = callback;
  }

  onTopicDataMessageWS(callback) {
    this.connections.topicDataWS.onMessageReceived(callback);
  }

  send(clientID, message) {
    if (this.connections.topicDataWS.hasClient(clientID)) {
      this.connections.topicDataWS.send(clientID, message);
    } else {
      this.connections.topicDataZMQ.send(clientID, message);
    }
  }

  ping(clientID, callback) {}
}

module.exports = {
  ServerConnectionsManager: ServerConnectionsManager
};
