import test from 'ava';
import sinon from 'sinon';

import TestUtility from '../testUtility';

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

class PMCycles extends TestProcessingModule {
  constructor() {
    super();
  }
}

class PMFrequency extends TestProcessingModule {
  constructor() {
    super();
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
    this.processingMode = {
      lockstep: {}
    };
  }
}

class PMTriggerOnInput extends TestProcessingModule {
  constructor() {
    super();
    this.processingMode = {
      triggerOnInput: {}
    };
  }
}

class PMTriggerOnInputMinDelayUpdateAll extends TestProcessingModule {
  constructor() {
    super();
    this.processingMode = {
      triggerOnInput: {
        minDelayMs: 100,
        allInputsNeedUpdate: false
      }
    };
  }
}

/* test setup */

test.beforeEach((t) => {
  t.context.topicData = new RuntimeTopicData();
  t.context.sessionManager = new SessionManager(t.context.topicData);

  t.context.processingModules = [
    new PMCycles(),
    new PMFrequency(),
    new PMLockstep(),
    new PMTriggerOnInput(),
    new PMTriggerOnInputMinDelayUpdateAll()
  ];
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
        topic: '/' + pm.id + '/' + input.internalName
      });
    });

    let outputMappings = [];
    pm.outputs.forEach((output) => {
      outputMappings.push({
        outputName: output.internalName,
        topic: '/' + pm.id + '/' + output.internalName
      });
    });

    sessionSpecs.ioMappings.push({
      processingModuleId: pm.id,
      inputMappings: inputMappings,
      outputMappings: outputMappings
    });
  });
});

/* run tests */

test('run session containing PMs with different processing modes', async (t) => {
  t.pass();
});
