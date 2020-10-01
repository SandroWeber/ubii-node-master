const WebSocket = require('ws');
var https = require('https');
const fs = require('fs');
const url = require('url');

const configService = require('../config/configService');

class WebsocketServer {
  /**
   * Communication endpoint implementing the zmq router pattern.
   * @param {*} port Port to bind.
   * @param {*} onReceive Callback function that is called when a new message is received from a dealer.
   * Accepts an envelope parameter containing the client identity and a string parameter with the received message
   * @param {*} autoconnect Should the socket connect directly after the initialization of the object?
   * If not, the start method must be called manually.
   */
  constructor(port = 5555, autoconnect = true) {
    this.port = port;

    this.ready = false;
    this.clients = new Map();

    this.waitingPongCallbacks = new Map();

    if (autoconnect) {
      this.start();
    }
  }

  /**
   * Start the websocket server.
   */
  start() {
    if (configService.useHTTPS()) {
      var credentials = {
        //ca: [fs.readFileSync(PATH_TO_BUNDLE_CERT_1), fs.readFileSync(PATH_TO_BUNDLE_CERT_2)],
        cert: fs.readFileSync(configService.getPathCertificate()),
        key: fs.readFileSync(configService.getPathPrivateKey())
      };
      this.server = https.createServer(credentials);
      this.server.listen(this.port);
      this.wsServer = new WebSocket.Server({ server: this.server });
      this.endpoint = 'wss://*:' + this.port;
    } else {
      this.wsServer = new WebSocket.Server({ port: this.port });
      this.endpoint = 'ws://*:' + this.port;
    }

    this.wsServer.on('connection', (websocket, request) => {
      this._onConnection(websocket, request);
    });

    this.open = true;
  }

  /**
   * Stop the server and close the socket.
   */
  stop() {
    this.ready = false;
    this.wsServer.clients.forEach((websocket) => {
      websocket.close();
    });

    this.wsServer.close();
  }

  /**
   * Communication endpoint implementing the zmq router pattern.
   * @param {*} websocket The websocket for the new connection.
   * @param {*} request The request for the new connection.
   */
  _onConnection(websocket, request) {
    const {
      query: { clientID }
    } = url.parse(request.url, true);
    this.clients.set(clientID, websocket);

    websocket.on('message', (message) => {
      /*if (message.toString() === PONG_MESSAGE) {
       // Check if callback for pong device
       if (this.waitingPongCallbacks.has(request.origin.toString())) {
       // call callback
       this.waitingPongCallbacks.get(request.origin.toString())();
       // remove callback
       this.waitingPongCallbacks.delete(request.origin.toString());
  
       return;
       }
  
       return;
       }*/

      if (!this.onMessage) {
        namida.logFailure('Websocket Server', 'no callback for message handling set!');
      } else {
        this.onMessage(clientID, message);
      }
    });

    websocket.on('close', () => {
      //console.log('[' + new Date() + '] websocket peer disconnected.');
    });
  }

  /**
   * Set the message handling function to be called upon receiving a message. Also marks the this socket as ready to receive.
   * @param {*} callback Callback function that is called when a new message is received from a websocket client.
   * Callback should accept an ID parameter containing the client identity and a message parameter with the received message buffer.
   */
  onMessageReceived(callback) {
    this.onMessage = callback;
    this.ready = true;
  }

  /**
   * Send a payload (string or Buffer object) to the specified client.
   * @param {string} toClientId
   * @param {(string|Buffer)} payload
   */
  send(toClientId, message) {
    let client = this.clients.get(toClientId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(message, (error) => {
        if (error !== undefined) console.warn(error);
      });
    }
  }

  hasClient(clientID) {
    return this.clients.get(clientID);
  }

  /**
   * Ping the specified client.
   * @param {string} toClientId
   * @param {function} callback Callback function called when the pong message is received from the specified client.
   */
  ping(toClientId, callback) {
    this.waitingPongCallbacks.set(toClientId.toString(), callback);
    this.send(toClientId, PING_MESSAGE);
  }

  toString() {
    let status = this.ready ? 'ready' : 'not ready';

    return 'WS-Topicdata | ' + status + ' | websocket ' + this.endpoint;
  }
}

module.exports = WebsocketServer;
