const { ProtobufTranslator, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const { ConfigService, ZmqReply, ZmqRouter, WebsocketServer, HTTPServer } = require('@tum-far/ubii-node-nodejs');
const namida = require('@tum-far/namida/src/namida');

//const ZmqReply = require('./zmqReply');
//const ZmqRouter = require('./zmqRouter');

//const WebsocketServer = require('./websocketServer');
//const HTTPServer = require('./httpServer');

let _instance = null;
const SINGLETON_ENFORCER = Symbol();

class NetworkConnectionsManager {
  constructor(enforcer) {
    if (enforcer !== SINGLETON_ENFORCER) {
      throw new Error('Use ' + this.constructor.name + '.instance');
    }

    this.serviceReplyTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REPLY);
    this.serviceRequestTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REQUEST);
    this.topicDataTranslator = new ProtobufTranslator(MSG_TYPES.TOPIC_DATA);

    this.ready = false;

    this.profiling = ConfigService.instance.config.profiling && ConfigService.instance.config.profiling.enabled;
    if (this.profiling) {
      this.statistics = {
        counterTopicDataReceived: 0,
        counterTopicDataSent: 0
      }
    }
  }

  static get instance() {
    if (_instance == null) {
      _instance = new NetworkConnectionsManager(SINGLETON_ENFORCER);
    }

    return _instance;
  }

  openConnections() {
    this.connections = {};

    // ZMQ Service Component:
    this.connections.serviceZMQ = new ZmqReply('tcp', '*:' + ConfigService.instance.getPortServiceZMQ());

    // REST Service Component:
    this.connections.serviceREST = new HTTPServer(ConfigService.instance.getPortServiceREST());

    // ZMQ Topic Data Component:
    this.connections.topicDataZMQ = new ZmqRouter(
      'ZMQ-TCP-Topicdata',
      'tcp',
      '*:' + ConfigService.instance.getPortTopicdataZMQ()
    );

    // Websocket Topic Data Component:
    this.connections.topicDataWS = new WebsocketServer(ConfigService.instance.getPortTopicdataWS());

    // Inter-Process Communication Topic Data Component:
    let ipcSocketSupported = process.platform !== 'win32';
    if (ipcSocketSupported) {
      let pwd = process.env.PWD || process.env.INIT_CWD;
      this.connections.topicDataIPC = new ZmqRouter(
        'ZMQ-IPC-Topicdata',
        'ipc',
        pwd + ConfigService.instance.config.ipc.ipcEndpointTopicData
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

  setServiceRouteHTTP(route, callback) {
    this.connections.serviceREST.setServiceRoute(route, callback);
  }

  setCallbackServiceMessageZMQ(callback) {
    this.connections.serviceZMQ.setCallbackOnMessage(callback);
  }

  setCallbackOnTopicDataZMQ(callback) {
    if (this.profiling) {
      this.connections.topicDataZMQ.setCallbackOnMessage((clientID, message) => {
        this.statistics.counterTopicDataReceived++;
        callback(clientID, message);
      });
    } else {
      this.connections.topicDataZMQ.setCallbackOnMessage(callback);
    }
  }

  setCallbackOnTopicDataWS(callback) {
    if (this.profiling) {
      this.connections.topicDataWS.setCallbackOnMessage((clientID, message) => {
        this.statistics.counterTopicDataReceived++;
        callback(clientID, message);
      });
    } else {
      this.connections.topicDataWS.setCallbackOnMessage(callback);
    }
  }

  send(clientID, message) {
    if (this.connections.topicDataWS.hasClient(clientID)) {
      this.connections.topicDataWS.send(clientID, message);
    } else {
      this.connections.topicDataZMQ.send(clientID, message);
    }

    if (this.profiling) {
      this.statistics.counterTopicDataSent++;
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
    let httpsEnabled = ConfigService.instance.useHTTPS() ? 'enabled' : 'disabled';
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

module.exports = NetworkConnectionsManager;
