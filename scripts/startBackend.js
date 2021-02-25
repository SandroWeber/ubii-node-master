const { MasterNode } = require('../src/index.js');
const ExternalLibrariesService = require('../src/processing/externalLibrariesService');

const fs = require('fs');

(function () {
  ExternalLibrariesService.addExternalLibrary('fs', fs);

  let master = new MasterNode();
})();
