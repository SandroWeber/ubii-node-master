const os = require('os');

const {
  defaultTopicDataServerPortZMQ,
  defaultTopicDataServerPortWS,
  defaultServiceServerPortZMQ,
  defaultServiceServerPortREST
} = require('../node/constants.js');

const ZmqReply = require('./zmqReply');
const ZmqRouter = require('./zmqRouter');

const WebsocketServer = require('./websocketServer');
const RESTServer = require('./restServer');

const { ProtobufTranslator, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

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
    this.serviceReplyTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REPLY);
    this.serviceRequestTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REQUEST);
    this.topicDataTranslator = new ProtobufTranslator(MSG_TYPES.TOPIC_DATA);

    this.getIPConfig();

    this.openConnections();
  }

  getIPConfig() {
    this.hostAdresses = {
      ethernet: undefined,
      wlan: undefined
    };

    let ifaces = os.networkInterfaces();
    Object.keys(ifaces).forEach((ifname) => {
      ifaces[ifname].forEach((iface) => {
        if (iface.family === 'IPv4' && !iface.internal) {
          if (ifname.indexOf('en') === 0) {
            this.hostAdresses.ethernet = iface.address;
          } else if (ifname.indexOf('wl') === 0) {
            this.hostAdresses.wlan = iface.address;
          }
        }
      });
    });
  }

  openConnections() {
    this.connections = {};

    // ZMQ Service Server Component:
    this.connections.serviceZMQ = new ZmqReply(
      this.ports.serviceZMQ,
      (message) => { },
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
      (envelope, message) => { }
    );

    // Websocket Topic Data Server Component:
    this.connections.topicDataWS = new WebsocketServer(
      this.ports.topicDataWS,
      (message) => { }
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

  ping(clientID, callback) {

  }
}

module.exports = {
  'ServerConnectionsManager': ServerConnectionsManager,
};