const { MasterNode } = require('../src/index.js');
const ExternalLibrariesService = require('../src/sessions/externalLibrariesService');

const tf = require('@tensorflow/tfjs-node');
const cocoSsd = require('@tensorflow-models/coco-ssd');
const emgClassifier = require('@baumlos/emg-classifier');
const fs = require('fs');

(function () {
  ExternalLibrariesService.addExternalLibrary('tf', tf);
  ExternalLibrariesService.addExternalLibrary('cocoSsd', cocoSsd);
  ExternalLibrariesService.addExternalLibrary('emgClassifier', emgClassifier);
  ExternalLibrariesService.addExternalLibrary('fs', fs);

  let master = new MasterNode();
})();
