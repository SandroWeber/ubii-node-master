import test from 'ava';
import sinon from 'sinon';

import TestUtility from '../../testUtility';

import { SessionManager, ProcessingModule, ProcessingModuleManager } from '../../../src/index';
import { RuntimeTopicData } from '@tum-far/ubii-topic-data';
const { proto } = require('@tum-far/ubii-msg-formats');
const SessionStatus = proto.ubii.sessions.SessionStatus;

/* preparation */

class TestProcessingModule extends ProcessingModule {
  constructor() {
    super();

    this.onCreated = sinon.fake();
    this.onProcessing = sinon.fake();

    this.inputs = [
      { internalName: 'inBool', messageFormat: 'bool' },
      { internalName: 'inInt', messageFormat: 'int32' },
      { internalName: 'inString', messageFormat: 'string' }
    ];
    this.outputs = [
      { internalName: 'outBool', messageFormat: 'bool' },
      { internalName: 'outInt', messageFormat: 'int32' },
      { internalName: 'outString', messageFormat: 'string' }
    ];
  }
}

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
        minDelayMs: 1000,
        allInputsNeedUpdate: true
      }
    };
  }
}

let getTopicForModuleIO = (processingModule, moduleIO) => {
  return '/' + processingModule.id + '/' + moduleIO.internalName;
};

let publishTopicForModuleIO = (topicdata, processingModule, moduleIO) => {
  let topic = getTopicForModuleIO(processingModule, moduleIO);
  let data = undefined;
  if (moduleIO.messageFormat === 'bool') {
    data = true;
  } else if (moduleIO.messageFormat === 'int32') {
    data = 42;
  } else if (moduleIO.messageFormat === 'string') {
    data = 'placeholder';
  }
  topicdata.publish(topic, data, moduleIO.messageFormat);
  console.info('published ' + data + ' on topic ' + topic);
};

/* test setup */

test.beforeEach((t) => {
  t.context.topicData = new RuntimeTopicData();
  t.context.sessionManager = new SessionManager(t.context.topicData);

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
    t.context.sessionManager.processingModuleManager.addModule(pm);
  });

  let sessionSpecs = {
    name: 'test-session-combined-processing-modes',
    processingModules: [],
    ioMappings: []
  };
  t.context.processingModules.forEach((pm) => {
    sessionSpecs.processingModules.push({ id: pm.id });

    let inputMappings = [];
    pm.inputs.forEach((input) => {
      inputMappings.push({
        inputName: input.internalName,
        topic: getTopicForModuleIO(pm, input),
        topicSource: 'topic'
      });
    });

    let outputMappings = [];
    pm.outputs.forEach((output) => {
      outputMappings.push({
        outputName: output.internalName,
        topic: getTopicForModuleIO(pm, output),
        topicDestionation: 'topic'
      });
    });

    sessionSpecs.ioMappings.push({
      processingModuleId: pm.id,
      inputMappings: inputMappings,
      outputMappings: outputMappings
    });
  });
  t.context.session = t.context.sessionManager.createSession(sessionSpecs);
});

test.afterEach((t) => {
  t.context.sessionManager.stopAllSessions();
});

/* run tests */

test('run session containing PMs with different processing modes', async (t) => {
  let topicData = t.context.topicData;
  let pmToI = t.context.pmTriggerOnInput;
  let pmToIMinDelayUpdateAll = t.context.pmTriggerOnInputMinDelayUpdateAll;

  t.context.sessionManager.startAllSessions();

  // trigger input for PMTriggerOnInput in quick succession, should only trigger once
  publishTopicForModuleIO(topicData, pmToI, pmToI.inputs[0]);
  publishTopicForModuleIO(topicData, pmToI, pmToI.inputs[1]);
  publishTopicForModuleIO(topicData, pmToI, pmToI.inputs[2]);
  // trigger input for PMTriggerOnInputMinDelayUpdateAll
  publishTopicForModuleIO(topicData, pmToIMinDelayUpdateAll, pmToIMinDelayUpdateAll.inputs[0]);
  publishTopicForModuleIO(topicData, pmToIMinDelayUpdateAll, pmToIMinDelayUpdateAll.inputs[1]);
  publishTopicForModuleIO(topicData, pmToIMinDelayUpdateAll, pmToIMinDelayUpdateAll.inputs[2]);

  await TestUtility.wait(10);
  t.is(pmToI.onProcessing.callCount, 1);
  t.is(pmToIMinDelayUpdateAll.onProcessing.callCount, 1);

  pmToI.onProcessing.resetHistory();
  pmToIMinDelayUpdateAll.onProcessing.resetHistory();

  // trigger input for PMTriggerOnInput again twice with delay in between, should result in two processings
  publishTopicForModuleIO(topicData, pmToI, pmToI.inputs[0]);
  await TestUtility.wait(10);
  publishTopicForModuleIO(topicData, pmToI, pmToI.inputs[1]);
  // try to trigger PMTriggerOnInputMinDelayUpdateAll twice, should only run once because of minDelay
  publishTopicForModuleIO(topicData, pmToIMinDelayUpdateAll, pmToIMinDelayUpdateAll.inputs[0]);
  publishTopicForModuleIO(topicData, pmToIMinDelayUpdateAll, pmToIMinDelayUpdateAll.inputs[1]);
  publishTopicForModuleIO(topicData, pmToIMinDelayUpdateAll, pmToIMinDelayUpdateAll.inputs[2]);
  await TestUtility.wait(pmToIMinDelayUpdateAll.processingMode.triggerOnInput.minDelayMs / 4);
  publishTopicForModuleIO(topicData, pmToIMinDelayUpdateAll, pmToIMinDelayUpdateAll.inputs[0]);
  publishTopicForModuleIO(topicData, pmToIMinDelayUpdateAll, pmToIMinDelayUpdateAll.inputs[1]);
  publishTopicForModuleIO(topicData, pmToIMinDelayUpdateAll, pmToIMinDelayUpdateAll.inputs[2]);

  await TestUtility.wait(10);
  t.is(pmToI.onProcessing.callCount, 2);
  t.is(pmToIMinDelayUpdateAll.onProcessing.callCount, 1);
});
