const WebSocket = require('ws');
var https = require('https');
const fs = require('fs');
const url = require('url');

class WebsocketServer {

  /**
   * Communication endpoint implementing the zmq router pattern.
   * @param {*} port Port to bind.
   * @param {*} onReceive Callback function that is called when a new message is received from a dealer.
   * Accepts an envelope parameter containing the client identity and a string parameter with the received message
   * @param {*} autoconnect Should the socket connect directly after the initialization of the object?
   * If not, the start method must be called manually.
   */
  constructor(port = 5555, useHTTPS = true, autoconnect = true) {
    this.port = port;
    this.useHTTPS = useHTTPS;

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
    if (this.useHTTPS) {
      var credentials = {
        //ca: [fs.readFileSync(PATH_TO_BUNDLE_CERT_1), fs.readFileSync(PATH_TO_BUNDLE_CERT_2)],
        cert: fs.readFileSync('./certificates/ubii.com+5.pem'),
        key: fs.readFileSync('./certificates/ubii.com+5-key.pem')
      };
      this.server = https.createServer(credentials);
      this.server.listen(this.port);
      this.wsServer = new WebSocket.Server({ server: this.server });
      console.log('[' + new Date() + '] WebSocket Server: Listening on wss://*:' + this.port);
    } else {
      this.wsServer = new WebSocket.Server({ port: this.port });
      console.log('[' + new Date() + '] WebSocket Server: Listening on ws://*:' + this.port);
    }


    this.wsServer.on('connection', (websocket, request) => {
      this._onConnection(websocket, request);
    });
  }

  /**
   * Stop the server and close the socket.
   */
  stop() {
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
    const { query: { clientID } } = url.parse(request.url, true);
    console.log('[' + new Date() + '] websocket connection accepted from ID ' + clientID);

    //TODO: get proper client ID specification
    //let clientID = request.headers['sec-websocket-key'];
    //let clientID = this.clients.size;
    this.clients.set(clientID, websocket);

    websocket.on('message', (message) => {
      this._onMessage(clientID, message);
    });

    websocket.on('close', () => {
      console.log('[' + new Date() + '] websocket peer disconnected.');
    });
  }

  _onMessage(clientID, message) {
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

    if (!this.processMessage) {
      console.warn('[' + new Date() + '] WebsocketServer.onMessageReceived() has not been set!' +
        '\nClient ID:\n' + clientID + '\nMessage received:\n' + message);
    } else {
      this.processMessage(clientID, message);
    }
  }

  onMessageReceived(callback) {
    this.processMessage = callback;
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
}

module.exports = WebsocketServer;