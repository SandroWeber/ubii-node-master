import test from 'ava';
import sinon from 'sinon';

import * as tf from '@tensorflow/tfjs-node';
import { RuntimeTopicData } from '@tum-far/ubii-topic-data';

import { ProcessingModule, ProcessingModuleManager, Session } from '../../../src/index';
import ExternalLibrariesService from '../../../src/sessions/externalLibrariesService';

/* setup */

ExternalLibrariesService.addExternalLibrary('tf', tf);

class ExtendedProcessingModule extends ProcessingModule {
  constructor(specs) {
    super(specs);

    this.outputs = [
      {
        internalName: 'prediction',
        messageFormat: 'float'
      }
    ];
  }

  onCreated() {
    this.state.model = tf.sequential();
    this.state.model.add(tf.layers.dense({ units: 1, inputShape: [1] }));

    // Prepare the model for training: Specify the loss and the optimizer.
    this.state.model.compile({ loss: 'meanSquaredError', optimizer: 'sgd' });

    // Generate some synthetic data for training.
    const xs = tf.tensor2d([1, 2, 3, 4], [4, 1]);
    const ys = tf.tensor2d([1, 3, 5, 7], [4, 1]);
    // Train the model using the data.
    let fitData = async () => {
      await this.state.model.fit(xs, ys);
    };
    fitData();

    this.state.expectedPrediction = this.state.model
      .predict(tf.tensor2d([5], [1, 1]))
      .dataSync()[0];
  }

  onProcessing() {
    // Use the model to do inference on a data point the model hasn't seen before:
    let prediction = this.state.model
      .predict(this.state.modules.tf.tensor2d([5], [1, 1]))
      .dataSync()[0];
    this.prediction = prediction;
  }
}

let topicPrediction = '/tfjs-runtime-test/prediction';

/* run tests */

test('passing specifications to constructor', (t) => {
  let specs = {
    name: 'test-extended-pm',
    processingMode: {
      frequency: {
        hertz: 15
      }
    }
  };
  let pm = new ExtendedProcessingModule(specs);
  t.true(pm.id !== undefined && pm.id.length > 0);
  t.is(pm.name, specs.name);
  t.is(pm.processingMode, specs.processingMode);
});

test('overwritten lifecycle functions', (t) => {
  let pm = new ExtendedProcessingModule();
  // onCreated
  pm.onCreated(pm.state);
  t.true(pm.state.model !== undefined);
  // onProcessing
  let outputCB = sinon.fake();
  pm.setOutputSetter(pm.outputs[0].internalName, outputCB);
  t.notThrows(() => {
    pm.onProcessing();
  });
  t.is(outputCB.callCount, 1);
});

test('run session with module', async (t) => {
  let topicdata = new RuntimeTopicData();
  let pmManager = new ProcessingModuleManager(undefined, topicdata);

  let pm = new ExtendedProcessingModule();
  pm.onCreated();
  t.true(pm.state.model !== undefined);
  t.true(pm.state.expectedPrediction !== undefined);
  t.true(pmManager.addModule(pm));

  let sessionSpecs = {
    name: 'test-session',
    processingModules: [pm],
    ioMappings: [
      {
        processingModuleId: pm.id,
        outputMappings: [
          {
            name: pm.outputs[0].internalName,
            topicDestination: topicPrediction
          }
        ]
      }
    ]
  };
  let session = new Session(sessionSpecs, topicdata, undefined, pmManager);
  session.start();
  t.is(session.runtimeProcessingModules.length, 1);

  while (!topicdata.pull(topicPrediction)) {
    await TestUtility.wait(50);
  }

  t.is(topicdata.pull(topicPrediction).data, pm.state.expectedPrediction);
});
