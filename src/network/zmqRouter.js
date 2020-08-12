const zmq = require('zeromq');
const { PING_MESSAGE, PONG_MESSAGE } = require('./constants.js');

class ZmqRouter {
  /**
   * Communication endpoint implementing the zmq router pattern.
   * @param {*} identity ID string to uniquely identify this object. This id is used to route messages to this socket.
   * @param {*} transportProtocol Transport protocol to bind.
   * @param {*} endpoint Endpoint to bind.
   * @param {*} onReceive Callback function that is called when a new message is received from a dealer.
   * Accepts an envelope parameter containing the client identity and a string parameter with the received message
   * @param {*} autoBind Should the socket bind directly after the initialization of the object?
   * If not, the start method must be called manually.
   */
  constructor(
    identity,
    transportProtocol = 'tcp',
    address = '*:6666',
    onReceive = (envelope, payload) => {},
    autoBind = true
  ) {
    this.identity = identity;
    this.transportProtocol = transportProtocol;
    this.address = address;
    this.onReceive = onReceive;
    this.ready = false;

    this.socket = {};

    this.waitingPongCallbacks = new Map();

    if (autoBind) {
      this.start();
    }
  }

  /**
   * Start the router.
   */
  start() {
    // init
    this.socket = zmq.socket('router');
    this.socket.identity = this.identity;

    // add callbacks
    this.socket.on('message', (envelope, payload) => {
      // Process pongs
      if (payload.toString() === PONG_MESSAGE) {
        // Check if callback for pong device
        if (this.waitingPongCallbacks.has(envelope.toString())) {
          // call callback
          this.waitingPongCallbacks.get(envelope.toString())();
          // remove callback
          this.waitingPongCallbacks.delete(envelope.toString());

          return;
        }

        return;
      }

      this.onReceive(envelope, payload);
    });

    // bind
    this.endpoint = this.transportProtocol + '://' + this.address;
    console.info('zmq router endpoint: ' + this.endpoint);
    this.socket.bind(this.endpoint, (err) => {
      if (err) {
        console.log('Error: ' + err);
      } else {
        this.ready = true;
      }
    });
  }

  /**
   * Send a payload (string or Buffer object) to the specified dealer client.
   * @param {string} toClientId
   * @param {(string|Buffer)} payload
   */
  send(toClientId, payload) {
    // send
    this.socket.send([toClientId, '', payload]);
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

  /**
   * Stop the router and close the socket.
   */
  stop() {
    this.ready = false;
    this.socket.close();
  }
}

module.exports = ZmqRouter;
