const zmq = require('zeromq');
const {
  PING_MESSAGE,
  PONG_MESSAGE
} = require('../../constants.js');

class ZmqDealer {

  /**
   * Communication endpoint implementing the zmq dealer pattern.
   * @param {*} identity ID string to uniquely identify this object. This id is used to route messages to this socket.
   * @param {*} host Host to connect to.
   * @param {*} port Port to connect to.
   * @param {*} onReceive Callback function accepting an envelope and a payload parameter that is called when a new message is received.
   * @param {*} autoConnect Should the socket connect directly after the initialization of the object?
   * If not, the start method must be called manually.
   */
  constructor(identity,
              host = 'localhost',
              port = 5555,
              onReceive = (envelope, payload) => {
              },
              autoConnect = true) {
    this.identity = identity;
    this.host = host;
    this.port = port;
    this.onReceive = onReceive;

    this.socket = {};

    if (autoConnect) {
      this.start();
    }
  }

  /**
   * Start the dealer.
   */
  start() {
    // init
    this.socket = zmq.socket('dealer');
    this.socket.identity = this.identity;

    // add callbacks
    this.socket.on('message', (envelope, payload) => {
      // process pings
      if (payload.toString() === PING_MESSAGE) {
        this.send(PONG_MESSAGE);
        return;
      }

      this.onReceive(envelope, payload);
    });

    // connect
    this.socket.connect('tcp://' + this.host + ':' + this.port);
  }

  /**
   * Send a payload (string or Buffer object) to the router.
   * @param {(string|Buffer)} payload
   */
  send(payload) {
    // send
    this.socket.send(payload);
  }

  /**
   * Stop the dealer and close the socket.
   */
  stop() {
    this.socket.close();
  }
}

module.exports = ZmqDealer;