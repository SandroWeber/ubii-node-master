const winston = require('winston');
const fs = require('fs');
const { ExternalLibrariesService, LoggingService } = require('@tum-far/ubii-node-nodejs');

const { MasterNode } = require('../src/index.js');

(function () {
  ExternalLibrariesService.instance.addExternalLibrary('fs', fs);

  let master = new MasterNode();

  master.logger.add(new winston.transports.File({ filename: 'master-node.info.log', level: 'info' }));
  /*master.logger.remove(winston.transports.Console);
  master.logger.configure({
    transports: [
      new winston.transports.Console({
        timestamp: function () {
          return Date.now();
        },
        formatter: function (options) {
          // - Return string will be passed to logger.
          // - Optionally, use options.colorize(options.level, <string>) to
          //   colorize output based on the log level.
          return (
            options.timestamp() +
            ' ' +
            config.colorize(options.level, options.level.toUpperCase()) +
            ' ' +
            (options.message ? options.message : '') +
            (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '')
          );
        }
      })
    ]
  });*/
  
  master.init();
})();
