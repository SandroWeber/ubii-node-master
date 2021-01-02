import test from 'ava';

import TestUtility from '../../testUtility';
import {
  TestProcessingModule,
  getTopicForModuleIO,
  getDataForModuleIO,
  publishTopicForModuleIO,
  addProcessingModulesToSessionSpec
} from '../utils';

import { SessionManager, ProcessingModuleManager } from '../../../src/index';
import { RuntimeTopicData } from '@tum-far/ubii-topic-data';

/* preparation */

class PMImmediateCycles extends TestProcessingModule {
  constructor() {
    super();
    this.name = 'PMImmediateCycles';
  }
}

class PMFrequency extends TestProcessingModule {
  constructor() {
    super();
    this.name = 'PMFrequency';
    this.processingMode = {
      frequency: {
        hertz: 30
      }
    };
  }
}

class PMLockstep extends TestProcessingModule {
  constructor() {
    super();
    this.name = 'PMLockstep';
    this.processingMode = {
      lockstep: {}
    };
  }
}

class PMTriggerOnInput extends TestProcessingModule {
  constructor() {
    super();
    this.name = 'PMTriggerOnInput';
    this.processingMode = {
      triggerOnInput: {}
    };
  }
}

class PMTriggerOnInputMinDelayUpdateAll extends TestProcessingModule {
  constructor() {
    super();
    this.name = 'PMTriggerOnInputMinDelayUpdateAll';
    this.processingMode = {
      triggerOnInput: {
        minDelayMs: 100,
        allInputsNeedUpdate: true
      }
    };
  }
}

/* test setup */

test.beforeEach((t) => {
  t.context.nodeID = 'test-master-node-id';
  t.context.topicData = new RuntimeTopicData();
  t.context.processingModuleManager = new ProcessingModuleManager(
    t.context.nodeID,
    undefined,
    t.context.topicData
  );
  t.context.sessionManager = new SessionManager(
    t.context.nodeID,
    t.context.topicData,
    undefined,
    t.context.processingModuleManager
  );

  t.context.processingModules = [
    new PMImmediateCycles(),
    new PMFrequency(),
    new PMLockstep(),
    new PMTriggerOnInput(),
    new PMTriggerOnInputMinDelayUpdateAll()
  ];
  t.context.pmImmediateCycles = t.context.processingModules[0];
  t.context.pmFrequency = t.context.processingModules[1];
  t.context.pmLockstep = t.context.processingModules[2];
  t.context.pmTriggerOnInput = t.context.processingModules[3];
  t.context.pmTriggerOnInputMinDelayUpdateAll = t.context.processingModules[4];
  t.context.processingModules.forEach((pm) => {
    t.context.processingModuleManager.addModule(pm);
  });

  let sessionSpec = {
    name: 'test-session-combined-processing-modes',
    processingModules: [],
    ioMappings: []
  };
  addProcessingModulesToSessionSpec(sessionSpec, t.context.processingModules);
  t.context.session = t.context.sessionManager.createSession(sessionSpec);
});

test.afterEach((t) => {
  t.context.sessionManager.stopAllSessions();
});

/* run tests */

test('run session containing PMs with different processing modes', async (t) => {
  let topicData = t.context.topicData;
  let pmImmediateCycles = t.context.pmImmediateCycles;
  let pmFrequency = t.context.pmFrequency;
  let pmLockstep = t.context.pmLockstep;
  let pmToI = t.context.pmTriggerOnInput;
  let pmToIMinDelayUpdateAll = t.context.pmTriggerOnInputMinDelayUpdateAll;

  // provide topic data for lockstep module
  pmLockstep.inputs.forEach((input) => {
    publishTopicForModuleIO(topicData, pmLockstep, input);
  });

  t.context.sessionManager.startAllSessions();

  /* trigger test run 1 */
  // guarantee that pmToIMinDelayUpdateAll can be triggered to process
  await TestUtility.wait(pmToIMinDelayUpdateAll.processingMode.triggerOnInput.minDelayMs);

  // trigger input for PMTriggerOnInput in quick succession, should only trigger once
  publishTopicForModuleIO(topicData, pmToI, pmToI.inputs[0]);
  publishTopicForModuleIO(topicData, pmToI, pmToI.inputs[1]);
  publishTopicForModuleIO(topicData, pmToI, pmToI.inputs[2]);
  // trigger input for PMTriggerOnInputMinDelayUpdateAll
  publishTopicForModuleIO(topicData, pmToIMinDelayUpdateAll, pmToIMinDelayUpdateAll.inputs[0]);
  publishTopicForModuleIO(topicData, pmToIMinDelayUpdateAll, pmToIMinDelayUpdateAll.inputs[1]);
  publishTopicForModuleIO(topicData, pmToIMinDelayUpdateAll, pmToIMinDelayUpdateAll.inputs[2]);

  await TestUtility.wait(100);
  t.is(pmToI.onProcessing.callCount, 1);
  t.is(pmToIMinDelayUpdateAll.onProcessing.callCount, 1);

  /* trigger test run 2 */
  pmToI.onProcessing.resetHistory();
  pmToIMinDelayUpdateAll.onProcessing.resetHistory();
  // guarantee that pmToIMinDelayUpdateAll can be triggered again to process
  await TestUtility.wait(pmToIMinDelayUpdateAll.processingMode.triggerOnInput.minDelayMs);

  // update input once
  publishTopicForModuleIO(topicData, pmToI, pmToI.inputs[0]);
  publishTopicForModuleIO(topicData, pmToIMinDelayUpdateAll, pmToIMinDelayUpdateAll.inputs[0]);
  publishTopicForModuleIO(topicData, pmToIMinDelayUpdateAll, pmToIMinDelayUpdateAll.inputs[1]);
  publishTopicForModuleIO(topicData, pmToIMinDelayUpdateAll, pmToIMinDelayUpdateAll.inputs[2]);
  // wait some time but not enough for PMTriggerOnInputMinDelayUpdateAll to trigger again
  await TestUtility.wait(pmToIMinDelayUpdateAll.processingMode.triggerOnInput.minDelayMs / 4);
  // update input a second time
  publishTopicForModuleIO(topicData, pmToI, pmToI.inputs[1]);
  publishTopicForModuleIO(topicData, pmToIMinDelayUpdateAll, pmToIMinDelayUpdateAll.inputs[0]);
  publishTopicForModuleIO(topicData, pmToIMinDelayUpdateAll, pmToIMinDelayUpdateAll.inputs[1]);
  publishTopicForModuleIO(topicData, pmToIMinDelayUpdateAll, pmToIMinDelayUpdateAll.inputs[2]);

  await TestUtility.wait(10);
  t.is(pmToI.onProcessing.callCount, 2);
  t.is(pmToIMinDelayUpdateAll.onProcessing.callCount, 1);

  // check other processing modules that continuously process
  t.true(pmImmediateCycles.onProcessing.callCount > 1);
  t.true(pmFrequency.onProcessing.callCount > 1);

  t.true(pmLockstep.onProcessing.callCount > 1);

  // check all PMs output was published
  t.context.processingModules.forEach((pm) => {
    pm.outputs.forEach((output) => {
      let topic = getTopicForModuleIO(pm, output);
      t.true(t.context.topicData.pull(topic).data === getDataForModuleIO(output));
    });
  });
});
