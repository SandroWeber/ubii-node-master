const express = require('express');
//var http = require('http');
var https = require('https');
const bodyParser = require('body-parser');
const fs = require('fs');

class RESTServer {

  /**
   * Communication endpoint implementing the zmq reply pattern.
   * @param {*} port Port to bind.
   * @param {*} autoBind Should the socket bind directly after the initialization of the object?
   * If not, the start method must be called manually.
   */
  constructor(port = 5555, portHTTPS = 41000, autoBind = true) {
    this.port = port;
    this.portHTTPS = portHTTPS;

    if (autoBind) {
      this.start();
    }
  }

  start() {
    // init
    this.app = express();
    //this.httpServer = http.createServer(this.app);
    var credentials = {
      //ca: [fs.readFileSync(PATH_TO_BUNDLE_CERT_1), fs.readFileSync(PATH_TO_BUNDLE_CERT_2)],
      cert: fs.readFileSync('./certs/ubii.com+5.pem'),
      key: fs.readFileSync('./certs/ubii.com+5-key.pem')
    };
    this.httpsServer = https.createServer(credentials, this.app);

    // CORS
    this.app.use(function (req, res, next) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, access-control-allow-origin");
      next();
    });

    this.app.use(bodyParser.urlencoded({ extended: true }));

    // VARIANT A: PROTOBUF
    /*this.app.use(bodyParser.raw({
      type: 'application/octet-stream',
      limit: '10mb'
    }));*/

    /// VARIANT B: JSON
    this.app.use(bodyParser.json());

    /*this.server = this.httpsServer.listen(this.port, () => {
      console.info('[' + new Date() + '] REST server listening on port ' + this.port)
    });*/
    this.server = this.httpsServer.listen(this.portHTTPS, () => {
      console.info('[' + new Date() + '] REST Server: Listening on *:' + this.portHTTPS)
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
