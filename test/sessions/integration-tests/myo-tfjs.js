import test from 'ava';
import uuidv4 from 'uuid/v4';

import TestUtility from '../testUtility';

import { SessionManager, DeviceManager } from '../../../src/index';
import { RuntimeTopicData } from '@tum-far/ubii-topic-data';


import mkdirp from 'mkdirp';
import fs from 'fs';

//import * as tfjsModel from '@tum-far/myo-gesture-something'; //-> put package in dependencies


/* helper functions */

let topicPrediction = '/tfjs-myo-test/prediction';

let processCB = (inputs, outputs, state) => {
  /* let prediction = state.model.predict(state.modules.tf.tensor2d(
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], [64,1]
    )).dataSync()[0]; */

  outputs.prediction = 5//prediction;
};

let onCreatedCB = async (state) => {    
  //const handler = state.modules.tf.io.fileSystem("tfjs models/myo rps/model.json"); 

  state.test = 1;
    
  const MODEL_PATH = "file:///tfjs-models/myo-rps/model.json";

  //Mobilenet test url, to test model loading
  const TEST_URL = "https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json";
  
  state.model = await state.modules.tf.loadGraphModel(MODEL_PATH);
  //state.model = await state.modules.tf.loadLayersModel(TEST_URL);
  
  state.test = 2;

  let prediction = state.model.predict(state.modules.tf.tensor2d(
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], [64,1]
    )).dataSync()[0];

};

let interactionSpecs = {
  id: uuidv4(),
  name: 'test-interaction',
  processingCallback: processCB.toString(),
  onCreated: onCreatedCB.toString(),
  outputFormats: [{
    internalName: 'prediction',
    messageFormat: 'double'
  }]
};

let sessionSpecs = {
  name: 'test-session',
  interactions: [interactionSpecs],
  ioMappings: [{
    interactionId: interactionSpecs.id,
    outputMappings: [{
      name: interactionSpecs.outputFormats[0].internalName,
      topicDestination: topicPrediction
    }]
  }]
};

/* initialize tests */

test.beforeEach(t => {
  t.context.topicData = new RuntimeTopicData();
  t.context.deviceManager = new DeviceManager(undefined, t.context.topicData, undefined);
  t.context.sessionManager = new SessionManager(t.context.topicData, t.context.deviceManager);
});


/* run tests */

test('execute interaction with TFjs example code', async t => {
  let session = t.context.sessionManager.createSession(sessionSpecs);
  await t.context.sessionManager.startAllSessions();
  t.is(session.runtimeInteractions.length, 1);
  
  //await TestUtility.wait(10000);
  
  let interaction = session.runtimeInteractions[0];
  t.is(interaction.state.test, 2); // -> load takes super long or dosn't finish until test is performed
  t.not(interaction.state.model, undefined);


  t.not(t.context.topicData.pull(topicPrediction).data, undefined);

  //t.is(t.context.topicData.pull(topicPrediction).data, interaction.state.expectedPrediction);
});