const express = require('express');
const http = require('http');
const https = require('https');
const bodyParser = require('body-parser');
const fs = require('fs');

const NetworkConfigManager = require('./networkConfigManager');

const configService = require('../config/configService');

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

    let ipLan = NetworkConfigManager.hostAdresses.ethernet;
    let ipWifi = NetworkConfigManager.hostAdresses.wifi;
    if (configService.useHTTPS()) {
      this.allowedOrigins = configService.getAllowedOrigins();
    } else {
      this.allowedOrigins = [
        'http://' + ipLan + ':8080',
        'http://' + ipLan + ':8081',
        'http://' + ipWifi + ':8080',
        'http://' + ipWifi + ':8081',
        'http://localhost:8080',
        'http://localhost:8081'
      ];
    }

    this.ready = false;

    if (autoBind) {
      this.start();
    }
  }

  start() {
    // init
    this.app = express();

    if (configService.useHTTPS()) {
      var credentials = {
        //ca: [fs.readFileSync(PATH_TO_BUNDLE_CERT_1), fs.readFileSync(PATH_TO_BUNDLE_CERT_2)],
        cert: fs.readFileSync(configService.getPathCertificate()),
        key: fs.readFileSync(configService.getPathPrivateKey())
      };
      this.server = https.createServer(credentials, this.app);
      this.endpoint = 'https://*:' + this.port;
    } else {
      this.server = http.createServer(this.app);
      this.endpoint = 'http://*:' + this.port;
    }

    // CORS
    this.app.use((req, res, next) => {
      let validOrigin = this.allowedOrigins.find((element) => element === req.headers.origin);
      res.header('Access-Control-Allow-Origin', validOrigin);
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

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
      this.ready = true;
    });
  }

  stop() {
    this.ready = false;
    this.server.close();
  }

  setRoutePOST(route, callback) {
    this.app.post(route, callback);
  }
}

module.exports = RESTServer;
