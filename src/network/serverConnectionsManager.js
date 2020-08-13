const { ProtobufTranslator, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const ZmqReply = require('./zmqReply');
const ZmqRouter = require('./zmqRouter');

const WebsocketServer = require('./websocketServer');
const RESTServer = require('./restServer');

const configService = require('../config/configService');
const namida = require('@tum-far/namida/src/namida');

class ServerConnectionsManager {
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
      'server_zmq',
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
        'server_zmq_icp_topicdata',
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
        this.connections.topicDataWS.ready &&
        (!this.connections.topicDataIPC || this.connections.topicDataIPC.ready)
      ) {
        let httpsEnabled = configService.useHTTPS() ? 'enabled' : 'disabled';
        let message = 'all connections ready - HTTPS ' + httpsEnabled + ' - endpoints:';
        message += '\nZMQ services = ' + this.connections.serviceZMQ.endpoint;
        message +=
          '\nREST services = ' +
          this.connections.serviceREST.endpoint +
          ' (POST to ' +
          this.connections.serviceREST.endpoint +
          '/services)';
        message += '\nZMQ topic data = ' + this.connections.topicDataZMQ.endpoint;
        message += '\nWS topic data = ' + this.connections.topicDataWS.endpoint;
        if (this.connections.topicDataIPC && this.connections.topicDataIPC.ready) {
          message += '\nZMQ ICP topic data = ' + this.connections.topicDataIPC.endpoint;
        }
        namida.logSuccess('Connection Manager', message);

        this.ready = true;
      } else {
        if (Date.now() > timeoutDate) {
          namida.logFailure(
            'Connection Manager',
            'not all connections ready:' +
              '\nZMQ services: ' +
              this.connections.serviceZMQ.ready +
              '\nREST services: ' +
              this.connections.serviceREST.ready +
              '\nZMQ topic data: ' +
              this.connections.topicDataZMQ.ready +
              '\nWS topic data: ' +
              this.connections.topicDataWS.ready +
              '\nZMQ IPC topic data: ' +
              this.connections.topicDataIPC.ready
          );
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
    this.connections.serviceREST.setRoutePOST('/services', (request, response) => {
      callback(request, response);
    });
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

  ping(clientID, callback) {}
}

module.exports = {
  ServerConnectionsManager: ServerConnectionsManager
};
