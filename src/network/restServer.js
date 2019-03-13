const express = require('express');
const bodyParser = require('body-parser');

class RESTServer {

  /**
   * Communication endpoint implementing the zmq reply pattern.
   * @param {*} port Port to bind.
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

    // CORS
    this.app.use(function(req, res, next) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
      next();
    });

    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.use(bodyParser.json());
    /*this.app.use(bodyParser.raw({
      type: 'application/octet-stream',
      limit: '10mb'
    }));*/

    this.server = this.app.listen(this.port, () => {
      console.info('[' + new Date() + '] REST server listening on port ' + this.port)
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
