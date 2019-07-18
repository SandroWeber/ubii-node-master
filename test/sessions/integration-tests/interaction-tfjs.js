import test from 'ava';
import uuidv4 from 'uuid/v4';

import TestUtility from '../testUtility';
import Utils from '../../../src/utilities';

import { SessionManager, DeviceManager } from '../../../src/index';
import { RuntimeTopicData } from '@tum-far/ubii-topic-data';

/* helper functions */

let processCB = (inputs, outputs, state) => {
  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 1, inputShape: [1] }));

  // Prepare the model for training: Specify the loss and the optimizer.
  model.compile({ loss: 'meanSquaredError', optimizer: 'sgd' });

  // Generate some synthetic data for training.
  const xs = tf.tensor2d([1, 2, 3, 4], [4, 1]);
  const ys = tf.tensor2d([1, 3, 5, 7], [4, 1]);

  // Train the model using the data.
  model.fit(xs, ys).then(() => {
    // Use the model to do inference on a data point the model hasn't seen before:
    model.predict(tf.tensor2d([5], [1, 1])).print();
  });
};

let interactionSpecs = {
  id: uuidv4(),
  name: 'test-interaction',
  processingCallback: processCB.toString(),
  inputFormats: [{
    internalName: 'mux',
    messageFormat: 'double'
  }],
  outputFormats: [{
    internalName: 'demux',
    messageFormat: 'string'
  }]
};

let sessionSpecs = {
  name: 'test-session',
  interactions: [interactionSpecs],
  ioMappings: [{
    interactionId: interactionSpecs.id,
    inputMappings: [{
      name: interactionSpecs.inputFormats[0].internalName,
      topicSource: topicMuxSpecs
    }],
    outputMappings: [{
      name: interactionSpecs.outputFormats[0].internalName,
      topicDestination: topicDemuxSpecs
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
  t.is(true, true);
});