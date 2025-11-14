const { MasterNode } = require('../src/node/masterNode');
const { ExternalLibrariesService, LoggingService } = require('@tum-far/ubii-node-nodejs');
const fs = require('fs');
const winston = require('winston');

(function () {
  // Add external libraries
  ExternalLibrariesService.instance.addExternalLibrary('fs', fs);

  const master = new MasterNode();

  master.logger.add(new winston.transports.File({ filename: 'master-node.info.log', level: 'info' }));

  master.init();
})();
