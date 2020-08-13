const zmq = require('zeromq');
const namida = require('@tum-far/namida/src/namida');

class ZmqReply {
  /**
   * Communication endpoint implementing the zmq reply pattern.
   * @param {*} transportProtocol Transport protocol to bind to.
   * @param {*} address Address to bind to.
   * @param {*} autoBind Should the socket bind directly after the initialization of the object?
   * If not, the start method must be called manually.
   */
  constructor(transportProtocol = 'tcp', address = '*:5555', autoBind = true) {
    this.transportProtocol = transportProtocol;
    this.address = address;

    this.ready = false;
    this.socket = {};

    if (autoBind) {
      this.start();
    }
  }

  start() {
    // init
    this.socket = zmq.socket('rep');

    // add callbacks
    this.socket.on('message', (request) => {
      if (!this.onMessage) {
        namida.logFailure('ZMQ reply socket', 'no callback for message handling set!');
      } else {
        let replyBuffer = this.onMessage(request);
        this.socket.send(replyBuffer);
      }
    });

    // bind
    this.endpoint = this.transportProtocol + '://' + this.address;
    this.socket.bind(this.endpoint, (err) => {
      if (err) {
        console.log('Error: ' + err);
      } else {
        this.open = true;
      }
    });
  }

  stop() {
    this.ready = false;
    this.socket.close();
  }

  /**
   * Set the message handling function to be called upon receiving a message. Also marks the this socket as ready to receive.
   * @param {*} callback Callback function that is called when a new message is received from a request socket.
   * Callback should accept a message parameter with the received message buffer.
   */
  onMessageReceived(callback) {
    this.onMessage = callback;
    this.ready = true;
  }
}

module.exports = ZmqReply;
