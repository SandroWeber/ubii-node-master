const {
  defaultTopicDataServerPortZMQ,
  defaultTopicDataServerPortWS,
  defaultServiceServerPortZMQ,
  defaultServiceServerPortREST
} = require('./constants.js');

const {
  ZmqRouter,
  ZmqReply,
  WebsocketServer,
  RESTServer
} = require('@tum-far/ubii-msg-transport');

const {
  ServiceRequestTranslator,
  ServiceReplyTranslator,
  TopicDataTranslator
} = require('@tum-far/ubii-msg-formats');

class ServerConnectionsManager {
  constructor(portTopicDataZMQ = defaultTopicDataServerPortZMQ,
              portTopicDataWS = defaultTopicDataServerPortWS,
              portServiceZMQ = defaultServiceServerPortZMQ,
              portServiceREST = defaultServiceServerPortREST) {
    this.ports = {
      serviceREST: portServiceREST,
      serviceZMQ: portServiceZMQ,
      topicDataWS: portTopicDataWS,
      topicDataZMQ: portTopicDataZMQ
    };

    // Translators:
    this.serviceReplyTranslator = new ServiceReplyTranslator();
    this.serviceRequestTranslator = new ServiceRequestTranslator();
    this.topicDataTranslator = new TopicDataTranslator();

    this.openConnections();
  }

  openConnections() {
    this.connections = {};

    // ZMQ Service Server Component:
    this.connections.serviceZMQ = new ZmqReply(
      this.ports.serviceZMQ,
      (message) => {},
      true
    );

    // REST Service Server Component:
    this.connections.serviceREST = new RESTServer(
      this.ports.serviceREST,
      true
    );

    // ZMQ Topic Data Server Component:
    this.connections.topicDataZMQ = new ZmqRouter(
      'server_zmq',
      this.ports.topicDataZMQ,
      (envelope, message) => {}
    );

    // Websocket Topic Data Server Component:
    this.connections.topicDataWS = new WebsocketServer(
      'server_ws',
      this.ports.topicDataWS,
      (message) => {}
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
    this.connections.topicDataWS.onReceive = callback;
  }

  send(clientID, message) {
    let clientConnectionWS = this.connections.topicDataWS.clients.get(clientID);
    if (clientConnectionWS) {
      clientConnectionWS.send(message);
    } else {
      this.connections.topicDataZMQ.send(clientID, message);
    }
  }

  ping(clientID, callback) {

  }
}

module.exports = {
  'ServerConnectionsManager': ServerConnectionsManager,
};