const { ProtobufTranslator, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const ZmqReply = require('./zmqReply');
const ZmqRouter = require('./zmqRouter');

const WebsocketServer = require('./websocketServer');
const RESTServer = require('./restServer');

const configService = require('../config/configService');
const namida = require('@tum-far/namida/src/namida');

class NetworkConnectionsManager {
  constructor() {
    // Translators:
    this.serviceReplyTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REPLY);
    this.serviceRequestTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REQUEST);
    this.topicDataTranslator = new ProtobufTranslator(MSG_TYPES.TOPIC_DATA);

    this.ready = false;
    this.openConnections();
  }

  openConnections() {
    this.connections = {};

    // ZMQ Service Component:
    this.connections.serviceZMQ = new ZmqReply('tcp', '*:' + configService.getPortServiceZMQ());

    // REST Service Component:
    this.connections.serviceREST = new RESTServer(configService.getPortServiceREST());

    // ZMQ Topic Data Component:
    this.connections.topicDataZMQ = new ZmqRouter(
      'ZMQ-TCP-Topicdata',
      'tcp',
      '*:' + configService.getPortTopicdataZMQ()
    );

    // Websocket Topic Data Component:
    this.connections.topicDataWS = new WebsocketServer(configService.getPortTopicdataWS());

    // Inter-Process Communication Topic Data Component:
    let ipcSocketSupported = process.platform !== 'win32';
    if (ipcSocketSupported) {
      let pwd = process.env.PWD || process.env.INIT_CWD;
      this.connections.topicDataIPC = new ZmqRouter(
        'ZMQ-IPC-Topicdata',
        'ipc',
        pwd + configService.config.ipc.ipcEndpointTopicData
      );
    }

    let timeoutDate = Date.now() + 3000;
    let checkConnectionsReady = () => {
      if (
        this.connections.serviceZMQ &&
        this.connections.serviceZMQ.ready &&
        this.connections.serviceREST &&
        this.connections.serviceREST.ready &&
        this.connections.topicDataZMQ &&
        this.connections.topicDataZMQ.ready &&
        this.connections.topicDataWS &&
        this.connections.topicDataWS.ready
      ) {
        this.ready = true;
        this.logConnectionStatus();
      } else {
        if (Date.now() > timeoutDate) {
          this.logConnectionStatus();
        } else {
          setTimeout(checkConnectionsReady, 500);
        }
      }
    };
    checkConnectionsReady(timeoutDate);
  }

  onServiceMessageZMQ(callback) {
    this.connections.serviceZMQ.onMessageReceived(callback);
  }

  onServiceMessageREST(callback) {
    this.connections.serviceREST.onServiceMessageReceived(callback);
  }

  onTopicDataMessageZMQ(callback) {
    this.connections.topicDataZMQ.onMessageReceived(callback);
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
    if (this.connections.topicDataWS.hasClient(clientID)) {
      this.connections.topicDataWS.ping(clientID, callback);
    } else {
      this.connections.topicDataZMQ.ping(clientID, callback);
    }
  }

  logConnectionStatus() {
    let httpsEnabled = configService.useHTTPS() ? 'enabled' : 'disabled';
    let readyStatus = this.ready ? 'ready' : 'failed';
    let message = 'status=' + readyStatus + ' | HTTPS=' + httpsEnabled + ' | connections:';

    message += '\n' + this.connections.serviceZMQ.toString();
    message += '\n' + this.connections.serviceREST.toString();
    message += '\n' + this.connections.topicDataZMQ.toString();
    message += '\n' + this.connections.topicDataWS.toString();
    if (this.connections.topicDataIPC) {
      message += '\n' + this.connections.topicDataIPC.toString();
    } else {
      message += '\nZMQ-IPC-Topicdata unavailable';
    }

    if (this.ready) {
      namida.logSuccess('NetworkConnectionsManager', message);
    } else {
      namida.logFailure('NetworkConnectionsManager', message);
    }
  }
}

module.exports = {
  NetworkConnectionsManager: NetworkConnectionsManager
};
