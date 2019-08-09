import test from 'ava';
import uuidv4 from 'uuid/v4';

import TestUtility from '../testUtility';

import { SessionManager, DeviceManager } from '../../../src/index';
import { RuntimeTopicData } from '@tum-far/ubii-topic-data';

import * as tf from '@tensorflow/tfjs-node';


import mkdirp from 'mkdirp';
import fs from 'fs';
import { batchGetValue } from '@tensorflow/tfjs-layers/dist/variables';
import { weightsLoaderFactory } from '@tensorflow/tfjs-core/dist/io/io';

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

  //Own model path
  const MODEL_PATH = "file:///tfjs-models/myo-rps/model.json";
  
  //Mobilenet test url, to test model loading
  const TEST_URL = "https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json";
  
  try {
    state.model = state.modules.tf.sequential();
    state.model.add(state.modules.tf.layers.dense({ units: 1, inputShape: [1] }));
    
    // Prepare the model for training: Specify the loss and the optimizer.
    state.model.compile({ loss: 'meanSquaredError', optimizer: 'sgd' });
    
    // Generate some synthetic data for training.
    const xs = state.modules.tf.tensor2d([1, 2, 3, 4], [4, 1]);
    const ys = state.modules.tf.tensor2d([1, 3, 5, 7], [4, 1]);
    
    // Train the model using the data.
    await state.model.fit(xs, ys).then(() => {
      state.expectedPrediction = state.model.predict(state.modules.tf.tensor2d([5], [1, 1])).dataSync()[0];
      throw new TypeError('🦄'); //For testing if this line is reached
    });
    
    var waitabit = await new Promise(resolve => {
      setTimeout(() => {
        resolve(x);
      }, 2000);
    });
    
    //Official keras model example
    const model1 = await state.modules.tf.loadLayersModel('https://storage.googleapis.com/tfjs-models/tfjs/iris_v1/model.json');
    
    await state.modules.tf.loadLayersModel('https://storage.googleapis.com/tfjs-models/tfjs/iris_v1/model.json').then(() => {
      state.test = 2;
      throw new TypeError('🦄'); //For testing if this line is reached
    });
    
    //Official  graph model example
    const modelUrl ='https://storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v2_1.0_224/model.json';
    const model2 = await state.modules.tf.loadGraphModel(modelUrl);
    const zeros = tf.zeros([1, 224, 224, 3]);
    model.predict(zeros).print();
    
    
    //My own model
    state.model = await state.modules.tf.loadGraphModel(MODEL_PATH);
    //state.model = await state.modules.tf.loadLayersModel(TEST_URL); */
    
    state.test = 2;
    
  } catch (err){
    state.test = 2;
    throw err;
  } 

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
  let interaction = session.runtimeInteractions[0];
  
  //await TestUtility.wait(100);
  
  t.is(interaction.state.test, 2); // -> if fails, gets stuck at load model
  t.not(interaction.state.model, undefined);

  t.not(t.context.topicData.pull(topicPrediction).data, undefined);

  //t.is(t.context.topicData.pull(topicPrediction).data, interaction.state.expectedPrediction);
});