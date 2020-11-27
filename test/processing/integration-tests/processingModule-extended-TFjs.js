import test from 'ava';
import sinon from 'sinon';

import { RuntimeTopicData } from '@tum-far/ubii-topic-data';

import { ProcessingModuleManager, Session } from '../../../src/index';
import TestUtility from '../../testUtility';

import TestProcessingModuleTF from '../../files/processing/testProcessingModuleTF';

/* setup */

let topicPrediction = '/tfjs-runtime-test/prediction';

/* run tests */

test('passing specifications to constructor', (t) => {
  let specs = {
    processingMode: {
      frequency: {
        hertz: 15
      }
    }
  };
  let pm = new TestProcessingModuleTF(specs);
  t.true(pm.id !== undefined && pm.id.length > 0);
  t.true(pm.name.length > 0);
  t.is(pm.processingMode, specs.processingMode);
});

test('overwritten lifecycle functions', (t) => {
  let pm = new TestProcessingModuleTF();
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

  let pm = new TestProcessingModuleTF();
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
            outputName: pm.outputs[0].internalName,
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
