const { ExternalLibrariesService } = require('@tum-far/ubii-node-nodejs/src/index');

const { MasterNode } = require('../src/index.js');

const fs = require('fs');

(function () {
  ExternalLibrariesService.instance.addExternalLibrary('fs', fs);

  let master = new MasterNode();
})();
