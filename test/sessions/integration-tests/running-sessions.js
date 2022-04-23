import test from 'ava';

import TestUtility from '../../testUtility';

import {
  SessionManager,
  ProcessingModule,
  ProcessingModuleManager,
  ClientManager
} from '../../../src/index';
import { RuntimeTopicData } from '@tum-far/ubii-topic-data';
const { proto } = require('@tum-far/ubii-msg-formats');
const SessionStatus = proto.ubii.sessions.SessionStatus;

/* utility */

let topicNameInteger = 'deviceA->integerTopic';
let topicNameString = 'deviceB->stringTopic';

let cause2IntegerCondition = 42;

let getPM1Specs = () => {
  let processCB = (deltaT, inputs, state) => {
    let procResult = { outputs: {}, state: {} };
    if (state.counter === undefined) {
      procResult.state.counter = 0;
    } else {
      procResult.state.counter = state.counter + 1;
    }
    return procResult;
  };

  return {
    onProcessingStringified: processCB.toString()
  };
};

let getPM2Specs = () => {
  let processCB = (deltaT, inputs, state) => {
    let procResult = { outputs: {} };
    if (inputs.integer.int32 === 42 && state.triggerToggle) {
      procResult.state = {};
      procResult.state.triggerToggle = false;
      procResult.state.outputNumber = state.outputNumber + 1;
      procResult.outputs.outString = {
        string: procResult.state.outputNumber.toString()
      };
    }
    return procResult;
  };
  return {
    onProcessingStringified: processCB.toString(),
    inputs: [
      {
        internalName: 'integer',
        messageFormat: 'int32'
      }
    ],
    outputs: [
      {
        internalName: 'outString',
        messageFormat: 'string'
      }
    ]
  };
};

let getGenericTopicInputBool = (session, pm) => {
  return session.id + '/' + pm.id + '/' + 'InputBool';
};

let getGenericTopicOutputString = (session, pm) => {
  return session.id + '/' + pm.id + '/' + 'OutputString';
};

let setupGenericProcessingModules = (session, pmManager, count, topicData) => {
  for (let i = 0; i < count; i = i + 1) {
    let processCB = (deltaT, inputs, state) => {
      let procResult = { outputs: {}, state: {} };
      procResult.state.counter = state.counter + 1;
      if (inputs.bool && procResult.state.counter % (i + 1) === 0) {
        procResult.outputs.outString = {
          string: procResult.state.counter.toString()
        }
      }

      return procResult;
    };
    let specs = {
      onProcessingStringified: processCB.toString(),
      inputs: [
        {
          internalName: 'bool',
          messageFormat: 'bool'
        }
      ],
      outputs: [
        {
          internalName: 'outString',
          messageFormat: 'string'
        }
      ]
    };

    let pm = new ProcessingModule(specs);
    pm.state.counter = 0;

    let inputTopicBool = getGenericTopicInputBool(session, pm);
    pm.setInputGetter('bool', () => {
      return topicData.pull(inputTopicBool) && topicData.pull(inputTopicBool).data;
    });
    let outputTopicString = getGenericTopicOutputString(session, pm);
    pm.setOutputSetter('outString', (value) => {
      topicData.publish(outputTopicString, value);
    });

    pmManager.addModule(pm);
    session.processingModules.push(pm);
  }
};

/* test setup */

test.beforeEach((t) => {
  t.context.nodeID = 'test-node-id-running-sessions';

  t.context.topicData = new RuntimeTopicData();

  t.context.clientManager = ClientManager.instance;
  t.context.clientManager.setDependencies(undefined, t.context.topicData);

  t.context.processingModuleManager = new ProcessingModuleManager(
    t.context.nodeID,
    undefined,
    t.context.topicData
  );

  t.context.sessionManager = SessionManager.instance; 
  t.context.sessionManager.setDependencies(
    t.context.nodeID,
    t.context.topicData,
    t.context.processingModuleManager
  );
  SessionManager.instance.removeAllSessions();
});

/* run tests */

test('single session - two processing modules', async (t) => {
  let sessionManager = t.context.sessionManager;
  let topicData = t.context.topicData;
  let pmManager = t.context.processingModuleManager;

  let pm1 = new ProcessingModule(getPM1Specs());
  pmManager.addModule(pm1);

  let pm2 = new ProcessingModule(getPM2Specs());
  pmManager.addModule(pm2);
  pm2.state.triggerToggle = true;
  pm2.state.outputNumber = 0;
  pm2.setInputGetter(pm2.inputs[0].internalName, () => {
    return topicData.pull(topicNameInteger);
  });
  pm2.setOutputSetter(pm2.outputs[0].internalName, (value) => {
    topicData.publish(topicNameString, value);
  });

  let topicIntegerTarget = 21;
  topicData.publish(topicNameInteger, {int32: topicIntegerTarget, type: 'int32'});
  topicData.publish(topicNameString, {string: '0', type: 'string'});

  let session = sessionManager.createSession({name: 'session - test: single session - two processing modules'});
  //session.processingModules = [];
  [pm1, pm2].forEach((pm) => {
    session.processingModules.push(pm.toProtobuf());
  });
  session.initialize();

  // start
  await sessionManager.startAllSessions();
  t.is(session.status === SessionStatus.RUNNING, true);

  // wait until t1
  await TestUtility.wait(500);
  // pm1 at t1
  let counterT1 = pm1.state.counter;
  t.is(counterT1 > 0, true);
  // pm2 at t1
  t.is(pm2.state.outputNumber, 0);
  t.is(pm2.state.triggerToggle, true);
  // topicData at t1
  t.is(topicData.pull(topicNameInteger).int32, topicIntegerTarget);
  t.is(topicData.pull(topicNameString).string, '0');

  // wait until t2
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, {int32: cause2IntegerCondition, type: 'int32'});
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, {int32: topicIntegerTarget, type: 'int32'});
  await TestUtility.wait(50);
  // pm1 at t2
  let counterT2 = pm1.state.counter;
  t.is(counterT2 > counterT1, true);
  // pm2 at t2
  t.is(pm2.state.outputNumber, 1);
  t.is(pm2.state.triggerToggle, false);
  // topicData at t2
  t.is(topicData.pull(topicNameInteger).int32, topicIntegerTarget);
  t.is(topicData.pull(topicNameString).string, '1');

  // wait until t3
  topicIntegerTarget = -50;
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, {int32: cause2IntegerCondition, type: 'int32'});
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, {int32: topicIntegerTarget, type: 'int32'});
  await TestUtility.wait(50);
  // interaction1 at t3
  let counterT3 = pm1.state.counter;
  t.is(counterT3 > counterT2, true);
  // interaction2 at t3
  t.is(pm2.state.outputNumber, 1);
  t.is(pm2.state.triggerToggle, false);
  // topicData at t3
  t.is(topicData.pull(topicNameInteger).int32, topicIntegerTarget);
  t.is(topicData.pull(topicNameString).string, '1');

  // wait until t4
  topicIntegerTarget = 0;
  pm2.state.triggerToggle = true;
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, {int32: 42, type: 'int32'});
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, {int32: topicIntegerTarget, type: 'int32'});
  await TestUtility.wait(50);
  // interaction1 at t4
  let counterT4 = pm1.state.counter;
  t.is(counterT4 > counterT3, true);
  // interaction2 at t4
  t.is(pm2.state.outputNumber, 2);
  t.is(pm2.state.triggerToggle, false);
  // topicData at t4
  t.is(topicData.pull(topicNameInteger).int32, topicIntegerTarget);
  t.is(topicData.pull(topicNameString).string, '2');

  // stop
  sessionManager.stopAllSessions();
  await TestUtility.wait(50);
  t.is(session.status === SessionStatus.STOPPED, true);
});

test('two sessions - one processing module each', async (t) => {
  let sessionManager = t.context.sessionManager;
  let topicData = t.context.topicData;
  let pmManager = t.context.processingModuleManager;

  let session1 = sessionManager.createSession({name: 'session 1 - test: two sessions - one processing module each'});
  let session2 = sessionManager.createSession({name: 'session 2 - test: two sessions - one processing module each'});

  let pm1 = new ProcessingModule(getPM1Specs());
  pmManager.addModule(pm1);
  session1.processingModules.push(pm1);
  session1.initialize();

  let pm2 = new ProcessingModule(getPM2Specs());
  pm2.state.triggerToggle = true;
  pm2.state.outputNumber = 0;
  pm2.setInputGetter(pm2.inputs[0].internalName, () => {
    return topicData.pull(topicNameInteger);
  });
  pm2.setOutputSetter(pm2.outputs[0].internalName, (value) => {
    topicData.publish(topicNameString, value);
  });
  pmManager.addModule(pm2);
  session2.processingModules.push(pm2);
  session2.initialize();

  let topicIntegerTarget = 21;
  topicData.publish(topicNameInteger, {int32: topicIntegerTarget, type: 'int32'});
  topicData.publish(topicNameString, {string: '0', type: 'string'});

  // start
  await sessionManager.startAllSessions();
  console.info('### after sessions started');
  t.is(session1.status === SessionStatus.RUNNING, true);
  t.is(session2.status === SessionStatus.RUNNING, true);

  // wait until t1
  await TestUtility.wait(100);
  // interaction1 at t1
  let counterT1 = pm1.state.counter;
  t.is(counterT1 > 0, true);
  // interaction2 at t1
  t.is(pm2.state.outputNumber, 0);
  t.is(pm2.state.triggerToggle, true);
  // topicData at t1
  t.is(topicData.pull(topicNameInteger).int32, topicIntegerTarget);
  t.is(topicData.pull(topicNameString).string, '0');

  // wait until t2
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, {int32: cause2IntegerCondition, type: 'int32'} );
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, {int32: topicIntegerTarget, type: 'int32'});
  await TestUtility.wait(50);
  // interaction1 at t2
  let counterT2 = pm1.state.counter;
  t.is(counterT2 > counterT1, true);
  // interaction2 at t2
  t.is(pm2.state.outputNumber, 1);
  t.is(pm2.state.triggerToggle, false);
  // topicData at t2
  t.is(topicData.pull(topicNameInteger).int32, topicIntegerTarget);
  t.is(topicData.pull(topicNameString).string, '1');

  // wait until t3
  topicIntegerTarget = -50;
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, {int32: cause2IntegerCondition, type: 'int32'});
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, {int32: topicIntegerTarget, type: 'int32'});
  await TestUtility.wait(50);
  // interaction1 at t3
  let counterT3 = pm1.state.counter;
  t.is(counterT3 > counterT2, true);
  // interaction2 at t3
  t.is(pm2.state.outputNumber, 1);
  t.is(pm2.state.triggerToggle, false);
  // topicData at t3
  t.is(topicData.pull(topicNameInteger).int32, topicIntegerTarget);
  t.is(topicData.pull(topicNameString).string, '1');

  // wait until t4
  topicIntegerTarget = 0;
  pm2.state.triggerToggle = true;
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, {int32: cause2IntegerCondition, type:'int32'});
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, {int32: topicIntegerTarget, type:'int32'});
  await TestUtility.wait(50);
  // interaction1 at t4
  let counterT4 = pm1.state.counter;
  t.is(counterT4 > counterT3, true);
  // interaction2 at t4
  t.is(pm2.state.outputNumber, 2);
  t.is(pm2.state.triggerToggle, false);
  // topicData at t4
  t.is(topicData.pull(topicNameInteger).int32, topicIntegerTarget);
  t.is(topicData.pull(topicNameString).string, '2');

  // stop
  sessionManager.stopAllSessions();
  await TestUtility.wait(50);
  t.is(session1.status === SessionStatus.STOPPED, true);
  t.is(session2.status === SessionStatus.STOPPED, true);
});

test('100 generic sessions with 100 generic interactions each', async (t) => {
  let sessionManager = t.context.sessionManager;
  let topicData = t.context.topicData;
  let pmManager = t.context.processingModuleManager;

  let sessionCount = 100;
  let waitTimePerSession = 20;
  for (let i = 0; i < sessionCount; i = i + 1) {
    let session = sessionManager.createSession();
    setupGenericProcessingModules(session, pmManager, 100, topicData);
    session.initialize();
  }

  await sessionManager.startAllSessions();
  sessionManager.sessions.forEach((session) => {
    t.is(session.status, SessionStatus.RUNNING);
  });

  await TestUtility.wait(sessionCount * waitTimePerSession);

  // nothing published on input topics yet, ouput topics should all still be undefined
  sessionManager.sessions.forEach((session) => {
    session.ioMappings &&
      session.ioMappings.forEach((mapping) => {
        t.is(mapping.interaction.state.counter > 0, true);
        t.is(
          topicData.pull(getGenericTopicOutputString(session, mapping.interaction)).data,
          undefined
        );
      });
  });

  // set all input bools to true
  sessionManager.sessions.forEach((session) => {
    session.ioMappings &&
      session.ioMappings.forEach((mapping) => {
        topicData.publish(getGenericTopicInputBool(session, mapping.interaction), true);
      });
  });
  await TestUtility.wait(sessionCount * waitTimePerSession);
  // nothing published on input topics yet, counters and ouput topics should all still be at 0
  sessionManager.sessions.forEach((session) => {
    session.ioMappings &&
      session.ioMappings.forEach((mapping) => {
        t.is(mapping.interaction.state.counter > 0, true);
        t.is(
          topicData.pull(getGenericTopicOutputString(session, mapping.interaction)).data !== '0',
          true
        );
      });
  });
});
