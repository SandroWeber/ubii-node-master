const { MasterNode } = require('../src/index.js');
const InteractModulesService = require('../src/sessions/interactionModulesService');

const tf = require('@tensorflow/tfjs-node');
const cocoSsd = require('@tensorflow-models/coco-ssd');
const emgClassifier = require('@baumlos/emg-classifier');
const fs = require('fs');

(function () {
  InteractModulesService.addModule('tf', tf);
  InteractModulesService.addModule('cocoSsd', cocoSsd);
  InteractModulesService.addModule('emgClassifier', emgClassifier);
  InteractModulesService.addModule('fs', fs);

  let master = new MasterNode();
})();
