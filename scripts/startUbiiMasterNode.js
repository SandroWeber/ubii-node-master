const winston = require('winston');
const fs = require('fs');
const { ExternalLibrariesService, LoggingService } = require('@tum-far/ubii-node-nodejs');

const { MasterNode } = require('../src/index.js');

(function () {
  ExternalLibrariesService.instance.addExternalLibrary('fs', fs);

  let master = new MasterNode();

  master.logger.add(new winston.transports.File({ filename: 'master-node.info.log', level: 'info' }));
  
  master.init();
})();
