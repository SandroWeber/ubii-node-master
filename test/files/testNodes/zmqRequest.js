var zmq = require('zeromq');

class ZmqRequest {

  /**
   * Communication endpoint implementing the zmq request pattern.
   * @param {*} host Host to connect to.
   * @param {*} port Port to connect to.
   * @param {*} onReceive Callback function that is called when a new message is received.
   * @param {*} autoConnect Should the socket connect directly after the initialization of the object?
   * If not, the start method must be called manually.
   */
  constructor(host = 'localhost',
              port = 5555,
              onReceive = (reply) => {
              },
              autoConnect = true) {
    this.serverHost = host;
    this.port = port;
    this.onReceive = onReceive;

    this.socket = {};

    if (autoConnect) {
      this.start();
    }
  }

  start() {
    // init
    this.socket = zmq.socket('req');

    // add callbacks
    this.socket.on('message', (message) => {
      this.onReceive(message);
    });

    // connect
    this.socket.connect('tcp://' + this.serverHost + ':' + this.port);
  }

  send(message) {
    this.socket.send(message);
  }

  stop() {
    this.socket.close();
  }

}


module.exports = ZmqRequest;
