const express = require('express');
const http = require('http');
const https = require('https');
const bodyParser = require('body-parser');
const fs = require('fs');

class RESTServer {

  /**
   * Communication endpoint implementing the zmq reply pattern.
   * @param {*} port Port to bind.
   * @param {*} autoBind Should the socket bind directly after the initialization of the object?
   * If not, the start method must be called manually.
   */
  constructor(port = 5555, useHTTPS = true, autoBind = true) {
    this.port = port;
    this.useHTTPS = useHTTPS;

    if (autoBind) {
      this.start();
    }
  }

  start() {
    // init
    this.app = express();

    if (this.useHTTPS) {
      console.info('RESTServer using HTTPS');
      var credentials = {
        //ca: [fs.readFileSync(PATH_TO_BUNDLE_CERT_1), fs.readFileSync(PATH_TO_BUNDLE_CERT_2)],
        cert: fs.readFileSync('./certs/ubii.com+5.pem'),
        key: fs.readFileSync('./certs/ubii.com+5-key.pem')
      };
      this.server = https.createServer(credentials, this.app);

      // CORS
      /*this.app.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, access-control-allow-origin");
        next();
      });*/
    } else {
      console.info('RESTServer using HTTP');
      this.server = http.createServer(this.app);

      // CORS
      /*this.app.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
      });*/
    }

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

    this.server.listen(this.port, () => {
      console.info('[' + new Date() + '] REST Server: Listening on *:' + this.port)
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
