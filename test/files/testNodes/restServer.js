const express = require('express');
const bodyParser = require('body-parser');

class RESTServer {

  /**
   * Communication endpoint implementing the zmq reply pattern.
   * @param {*} port Port to bind.
   * @param {*} onReceive Callback function that is called when a new message is received.
   * @param {*} autoBind Should the socket bind directly after the initialization of the object?
   * If not, the start method must be called manually.
   */
  constructor(port = 5555,
              autoBind = true) {
    this.port = port;

    if (autoBind) {
      this.start();
    }
  }

  start() {
    // init
    this.app = express();
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.use(bodyParser.json());

    this.server = this.app.listen(this.port, () => {
      console.info('REST server listening on port ' + this.port)
    });
  }

  stop() {
    this.server.close();
  }

  setRoutePOST(route, callback) {
    this.app.post(route, callback);
  }
}

module.exports = RESTServer;
