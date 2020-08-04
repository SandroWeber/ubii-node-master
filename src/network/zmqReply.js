const zmq = require('zeromq');

class ZmqReply {
  /**
   * Communication endpoint implementing the zmq reply pattern.
   * @param {*} port Port to bind.
   * @param {*} onReceive Callback function that is called when a new message is received.
   * @param {*} autoBind Should the socket bind directly after the initialization of the object?
   * If not, the start method must be called manually.
   */
  constructor(
    port = 5555,
    onReceive = (request) => {
      return request;
    },
    autoBind = true
  ) {
    this.port = port;
    this.onReceive = onReceive;
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
      let replyBuffer = this.onReceive(request);
      this.socket.send(replyBuffer);
    });

    // bind
    this.socket.bind('tcp://*:' + this.port + '', (err) => {
      if (err) {
        console.log('Error: ' + err);
      } else {
        this.ready = true;
      }
    });
  }

  stop() {
    this.ready = false;
    this.socket.close();
  }
}

module.exports = ZmqReply;
