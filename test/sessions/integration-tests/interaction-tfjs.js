import test from 'ava';
import uuidv4 from 'uuid/v4';

import TestUtility from '../testUtility';

import { SessionManager, DeviceManager } from '../../../src/index';
import { RuntimeTopicData } from '@tum-far/ubii-topic-data';

/* helper functions */

let topicPrediction = '/tfjs-runtime-test/prediction';

let processCB = (inputs, outputs, state) => {
  // Use the model to do inference on a data point the model hasn't seen before:
  let prediction = state.model.predict(state.modules.tf.tensor2d([5], [1, 1])).dataSync()[0];
  outputs.prediction = prediction;
};

let onCreatedCB = async (state) => {
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
  });
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
  t.not(interaction.state.model, undefined);

  await TestUtility.wait(50);

  t.is(t.context.topicData.pull(topicPrediction).data, interaction.state.expectedPrediction);
});