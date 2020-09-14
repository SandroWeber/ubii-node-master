import test from 'ava';

import TestUtility from '../testUtility';

import { SessionManager, ProcessingModule, ProcessingModuleManager } from '../../../src/index';
import { RuntimeTopicData } from '@tum-far/ubii-topic-data';
const { proto } = require('@tum-far/ubii-msg-formats');
const SessionStatus = proto.ubii.sessions.SessionStatus;

/* utility */

let topicNameInteger = 'deviceA->integerTopic';
let topicNameString = 'deviceB->stringTopic';

let cause2IntegerCondition = 42;

let getPM1Specs = () => {
  let processCB = (deltaT, input, output, state) => {
    if (state.counter === undefined) {
      state.counter = 0;
    } else {
      state.counter = state.counter + 1;
    }
  };

  return {
    onProcessingStringified: processCB.toString()
  };
};

let getPM2Specs = () => {
  let processCB = (deltaT, input, output, state) => {
    if (input.integer === 42 && state.triggerToggle) {
      state.triggerToggle = false;
      state.outputNumber = state.outputNumber + 1;
      output.string = state.outputNumber.toString();
    }
  };
  return {
    onProcessingStringified: processCB.toString(),
    inputFormats: [
      {
        internalName: 'integer',
        messageFormat: 'uint32'
      }
    ],
    outputFormats: [
      {
        internalName: 'string',
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

let setupGenericProcessingModules = (session, count, topicData) => {
  for (let i = 0; i < count; i = i + 1) {
    let processCB = (deltaT, input, output, state) => {
      state.counter = state.counter + 1;
      if (input.bool && state.counter % (i + 1) === 0) {
        output.string = state.counter.toString();
      }
    };
    let specs = {
      onProcessingStringified: processCB.toString(),
      inputFormats: [
        {
          internalName: 'bool',
          messageFormat: 'bool'
        }
      ],
      outputFormats: [
        {
          internalName: 'string',
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
    pm.setOutputSetter('string', (value) => {
      topicData.publish(outputTopicString, value, 'string');
    });

    session.addProcessingModule(pm);
  }
};

/* test setup */

test.beforeEach((t) => {
  t.context.topicData = new RuntimeTopicData();
  t.context.processingModuleManager = new ProcessingModuleManager(undefined, t.context.topicData);
  t.context.sessionManager = new SessionManager(t.context.topicData);
});

/* run tests */

test('single session - two processing modules', async (t) => {
  let sessionManager = t.context.sessionManager;
  let topicData = t.context.topicData;

  let session = sessionManager.createSession();

  let pm1 = new ProcessingModule(getPM1Specs());
  session.addProcessingModule(pm1);

  let pm2 = new ProcessingModule(getPM2Specs());
  session.addProcessingModule(pm2);
  pm2.state.triggerToggle = true;
  pm2.state.outputNumber = 0;
  pm2.setInputGetter(pm2.inputFormats[0].internalName, () => {
    return topicData.pull(topicNameInteger).data;
  });
  pm2.setOutputSetter(pm2.outputFormats[0].internalName, (value) => {
    topicData.publish(topicNameString, value, pm2.outputFormats[0].messageFormat);
  });

  let topicIntegerTarget = 21;
  topicData.publish(topicNameInteger, topicIntegerTarget);
  topicData.publish(topicNameString, '0');

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
  t.is(topicData.pull(topicNameInteger).data, topicIntegerTarget);
  t.is(topicData.pull(topicNameString).data, '0');

  // wait until t2
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, cause2IntegerCondition);
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, topicIntegerTarget);
  await TestUtility.wait(50);
  // pm1 at t2
  let counterT2 = pm1.state.counter;
  t.is(counterT2 > counterT1, true);
  // pm2 at t2
  t.is(pm2.state.outputNumber, 1);
  t.is(pm2.state.triggerToggle, false);
  // topicData at t2
  t.is(topicData.pull(topicNameInteger).data, topicIntegerTarget);
  t.is(topicData.pull(topicNameString).data, '1');

  // wait until t3
  topicIntegerTarget = -50;
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, cause2IntegerCondition);
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, topicIntegerTarget);
  await TestUtility.wait(50);
  // interaction1 at t3
  let counterT3 = pm1.state.counter;
  t.is(counterT3 > counterT2, true);
  // interaction2 at t3
  t.is(pm2.state.outputNumber, 1);
  t.is(pm2.state.triggerToggle, false);
  // topicData at t3
  t.is(topicData.pull(topicNameInteger).data, topicIntegerTarget);
  t.is(topicData.pull(topicNameString).data, '1');

  // wait until t4
  topicIntegerTarget = 0;
  pm2.state.triggerToggle = true;
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, 42);
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, topicIntegerTarget);
  await TestUtility.wait(50);
  // interaction1 at t4
  let counterT4 = pm1.state.counter;
  t.is(counterT4 > counterT3, true);
  // interaction2 at t4
  t.is(pm2.state.outputNumber, 2);
  t.is(pm2.state.triggerToggle, false);
  // topicData at t4
  t.is(topicData.pull(topicNameInteger).data, topicIntegerTarget);
  t.is(topicData.pull(topicNameString).data, '2');

  // stop
  sessionManager.stopAllSessions();
  t.is(session.status === SessionStatus.STOPPED, true);
});

test('two sessions - one processing module each', async (t) => {
  let sessionManager = t.context.sessionManager;
  let topicData = t.context.topicData;

  let session1 = sessionManager.createSession();
  let session2 = sessionManager.createSession();

  let pm1 = new ProcessingModule(getPM1Specs());
  session1.addProcessingModule(pm1);

  let pm2 = new ProcessingModule(getPM2Specs());
  session2.addProcessingModule(pm2);
  pm2.state.triggerToggle = true;
  pm2.state.outputNumber = 0;
  pm2.setInputGetter(pm2.inputFormats[0].internalName, () => {
    return topicData.pull(topicNameInteger).data;
  });
  pm2.setOutputSetter(pm2.outputFormats[0].internalName, (value) => {
    topicData.publish(topicNameString, value, pm2.outputFormats[0].messageFormat);
  });

  let topicIntegerTarget = 21;
  topicData.publish(topicNameInteger, topicIntegerTarget);
  topicData.publish(topicNameString, '0');

  // start
  await sessionManager.startAllSessions();
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
  t.is(topicData.pull(topicNameInteger).data, topicIntegerTarget);
  t.is(topicData.pull(topicNameString).data, '0');

  // wait until t2
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, cause2IntegerCondition);
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, topicIntegerTarget);
  await TestUtility.wait(50);
  // interaction1 at t2
  let counterT2 = pm1.state.counter;
  t.is(counterT2 > counterT1, true);
  // interaction2 at t2
  t.is(pm2.state.outputNumber, 1);
  t.is(pm2.state.triggerToggle, false);
  // topicData at t2
  t.is(topicData.pull(topicNameInteger).data, topicIntegerTarget);
  t.is(topicData.pull(topicNameString).data, '1');

  // wait until t3
  topicIntegerTarget = -50;
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, cause2IntegerCondition);
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, topicIntegerTarget);
  await TestUtility.wait(50);
  // interaction1 at t3
  let counterT3 = pm1.state.counter;
  t.is(counterT3 > counterT2, true);
  // interaction2 at t3
  t.is(pm2.state.outputNumber, 1);
  t.is(pm2.state.triggerToggle, false);
  // topicData at t3
  t.is(topicData.pull(topicNameInteger).data, topicIntegerTarget);
  t.is(topicData.pull(topicNameString).data, '1');

  // wait until t4
  topicIntegerTarget = 0;
  pm2.state.triggerToggle = true;
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, cause2IntegerCondition);
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, topicIntegerTarget);
  await TestUtility.wait(50);
  // interaction1 at t4
  let counterT4 = pm1.state.counter;
  t.is(counterT4 > counterT3, true);
  // interaction2 at t4
  t.is(pm2.state.outputNumber, 2);
  t.is(pm2.state.triggerToggle, false);
  // topicData at t4
  t.is(topicData.pull(topicNameInteger).data, topicIntegerTarget);
  t.is(topicData.pull(topicNameString).data, '2');

  // stop
  sessionManager.stopAllSessions();
  t.is(session1.status === SessionStatus.STOPPED, true);
  t.is(session2.status === SessionStatus.STOPPED, true);
});

test('100 generic sessions with 100 generic interactions each', async (t) => {
  let sessionManager = t.context.sessionManager;
  let topicData = t.context.topicData;

  let sessionCount = 100;
  let waitTimePerSession = 20;
  for (let i = 0; i < sessionCount; i = i + 1) {
    let session = sessionManager.createSession();
    setupGenericProcessingModules(session, 100, topicData);
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
