import test from 'ava';

import TestUtility from '../testUtility';

import { SessionManager, Session, Interaction } from '../../../src/index';
import { RuntimeTopicData } from '@tum-far/ubii-topic-data';
const { proto } = require('@tum-far/ubii-msg-formats');
const SessionStatus = proto.ubii.sessions.SessionStatus;

/* utility */

let topicNameInteger = 'deviceA->integerTopic';
let topicNameString = 'deviceB->stringTopic';

let cause2IntegerCondition = 42;

let getInteraction1Specs = () => {
  let processCB = (input, output, state) => {
    if (state.counter === undefined) {
      state.counter = 0;
    } else {
      state.counter = state.counter + 1;
    }
  };

  return {
    processingCallback: processCB.toString()
  };
};

let getInteraction2Specs = () => {
  let processCB = (input, output, state) => {
    if (input.integer === 42 && state.triggerToggle) {
      state.triggerToggle = false;
      state.outputNumber = state.outputNumber + 1;
      output.string = state.outputNumber.toString();
    }
  };
  return {
    processingCallback: processCB.toString(),
    inputFormats: [{
      internalName: 'integer',
      messageFormat: 'uint32'
    }],
    outputFormats: [{
      internalName: 'string',
      messageFormat: 'string'
    }]
  };
};

let getGenericTopicInputBool = (session, interaction) => {
  return session.id + '->' + interaction.id + '->' + 'InputBool';
};

let getGenericTopicOutputString = (session, interaction) => {
  return session.id + '->' + interaction.id + '->' + 'OutputString';
};

let setupGenericInteractions = (session, count, topicData) => {
  for (let i = 0; i < count; i = i + 1) {
    let processCB = (input, output, state) => {
      state.counter = state.counter + 1;
      if (input.bool && state.counter % (i + 1) === 0) {
        output.string = state.counter.toString();
      }
    };
    let specs = {
      processingCallback: processCB.toString(),
      inputFormats: [{
        internalName: 'bool',
        messageFormat: 'bool'
      }],
      outputFormats: [{
        internalName: 'string',
        messageFormat: 'string'
      }]
    };

    let interaction = new Interaction(specs);
    interaction.setTopicData(topicData);
    interaction.state.counter = 0;

    interaction.connectInputTopic('bool', getGenericTopicInputBool(session, interaction));
    interaction.connectOutputTopic('string', getGenericTopicOutputString(session, interaction));

    session.addInteraction(interaction);
  }
};

/* test setup */

test.beforeEach(t => {
  t.context.topicData = new RuntimeTopicData();
  t.context.sessionManager = new SessionManager(t.context.topicData);
});


/* run tests */

test('single session - two interactions', async t => {
  let sessionManager = t.context.sessionManager;
  let topicData = t.context.topicData;

  let session = sessionManager.createSession();

  //let interaction1 = setupInteraction1(topicData);
  let interaction1 = session.addInteraction(getInteraction1Specs());

  //let interaction2 = setupInteraction2(topicData);
  let interaction2 = session.addInteraction(getInteraction2Specs());
  interaction2.state.triggerToggle = true;
  interaction2.state.outputNumber = 0;
  interaction2.connectInputTopic(interaction2.inputFormats[0].internalName, topicNameInteger);
  interaction2.connectOutputTopic(interaction2.outputFormats[0].internalName, topicNameString);

  let topicIntegerTarget = 21;
  topicData.publish(topicNameInteger, topicIntegerTarget);
  topicData.publish(topicNameString, '0');

  // start
  await sessionManager.startAllSessions();
  t.is(session.status === SessionStatus.RUNNING, true);

  // wait until t1
  await TestUtility.wait(500);
  // interaction1 at t1
  let counterT1 = interaction1.state.counter;
  t.is(counterT1 > 0, true);
  // interaction2 at t1
  t.is(interaction2.state.outputNumber, 0);
  t.is(interaction2.state.triggerToggle, true);
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
  let counterT2 = interaction1.state.counter;
  t.is(counterT2 > counterT1, true);
  // interaction2 at t2
  t.is(interaction2.state.outputNumber, 1);
  t.is(interaction2.state.triggerToggle, false);
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
  let counterT3 = interaction1.state.counter;
  t.is(counterT3 > counterT2, true);
  // interaction2 at t3
  t.is(interaction2.state.outputNumber, 1);
  t.is(interaction2.state.triggerToggle, false);
  // topicData at t3
  t.is(topicData.pull(topicNameInteger).data, topicIntegerTarget);
  t.is(topicData.pull(topicNameString).data, '1');

  // wait until t4
  topicIntegerTarget = 0;
  interaction2.state.triggerToggle = true;
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, 42);
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, topicIntegerTarget);
  await TestUtility.wait(50);
  // interaction1 at t4
  let counterT4 = interaction1.state.counter;
  t.is(counterT4 > counterT3, true);
  // interaction2 at t4
  t.is(interaction2.state.outputNumber, 2);
  t.is(interaction2.state.triggerToggle, false);
  // topicData at t4
  t.is(topicData.pull(topicNameInteger).data, topicIntegerTarget);
  t.is(topicData.pull(topicNameString).data, '2');

  // stop
  sessionManager.stopAllSessions();
  t.is(session.status === SessionStatus.STOPPED, true);
});

test('two sessions - one interaction each', async t => {
  let sessionManager = t.context.sessionManager;
  let topicData = t.context.topicData;

  let session1 = sessionManager.createSession();
  let session2 = sessionManager.createSession();

  //let interaction1 = setupInteraction1(topicData);
  let interaction1 = session1.addInteraction(getInteraction1Specs());

  //let interaction2 = setupInteraction2(topicData);
  let interaction2 = session2.addInteraction(getInteraction2Specs());
  interaction2.state.triggerToggle = true;
  interaction2.state.outputNumber = 0;
  interaction2.connectInputTopic(interaction2.inputFormats[0].internalName, topicNameInteger);
  interaction2.connectOutputTopic(interaction2.outputFormats[0].internalName, topicNameString);

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
  let counterT1 = interaction1.state.counter;
  t.is(counterT1 > 0, true);
  // interaction2 at t1
  t.is(interaction2.state.outputNumber, 0);
  t.is(interaction2.state.triggerToggle, true);
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
  let counterT2 = interaction1.state.counter;
  t.is(counterT2 > counterT1, true);
  // interaction2 at t2
  t.is(interaction2.state.outputNumber, 1);
  t.is(interaction2.state.triggerToggle, false);
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
  let counterT3 = interaction1.state.counter;
  t.is(counterT3 > counterT2, true);
  // interaction2 at t3
  t.is(interaction2.state.outputNumber, 1);
  t.is(interaction2.state.triggerToggle, false);
  // topicData at t3
  t.is(topicData.pull(topicNameInteger).data, topicIntegerTarget);
  t.is(topicData.pull(topicNameString).data, '1');

  // wait until t4
  topicIntegerTarget = 0;
  interaction2.state.triggerToggle = true;
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, cause2IntegerCondition);
  await TestUtility.wait(50);
  topicData.publish(topicNameInteger, topicIntegerTarget);
  await TestUtility.wait(50);
  // interaction1 at t4
  let counterT4 = interaction1.state.counter;
  t.is(counterT4 > counterT3, true);
  // interaction2 at t4
  t.is(interaction2.state.outputNumber, 2);
  t.is(interaction2.state.triggerToggle, false);
  // topicData at t4
  t.is(topicData.pull(topicNameInteger).data, topicIntegerTarget);
  t.is(topicData.pull(topicNameString).data, '2');

  // stop
  sessionManager.stopAllSessions();
  t.is(session1.status === SessionStatus.STOPPED, true);
  t.is(session2.status === SessionStatus.STOPPED, true);
});

test('100 generic sessions with 100 generic interactions each', async t => {
  let sessionManager = t.context.sessionManager;
  let topicData = t.context.topicData;

  let sessionCount = 100;
  let waitTimePerSession = 20;
  for (let i = 0; i < sessionCount; i = i + 1) {
    let session = sessionManager.createSession();
    setupGenericInteractions(session, 100, topicData);
  }

  await sessionManager.startAllSessions();
  sessionManager.sessions.forEach((session) => {
    t.is(session.status, SessionStatus.RUNNING);
  });

  await TestUtility.wait(sessionCount * waitTimePerSession);

  // nothing published on input topics yet, ouput topics should all still be undefined
  sessionManager.sessions.forEach((session) => {
    session.ioMappings && session.ioMappings.forEach((mapping) => {
      t.is(mapping.interaction.state.counter > 0, true);
      t.is(topicData.pull(getGenericTopicOutputString(session, mapping.interaction)).data, undefined);
    })
  });

  // set all input bools to true
  sessionManager.sessions.forEach((session) => {
    session.ioMappings && session.ioMappings.forEach((mapping) => {
      topicData.publish(getGenericTopicInputBool(session, mapping.interaction), true);
    })
  });
  await TestUtility.wait(sessionCount * waitTimePerSession);
  // nothing published on input topics yet, counters and ouput topics should all still be at 0
  sessionManager.sessions.forEach((session) => {
    session.ioMappings && session.ioMappings.forEach((mapping) => {
      t.is(mapping.interaction.state.counter > 0, true);
      t.is(topicData.pull(getGenericTopicOutputString(session, mapping.interaction)).data !== '0', true);
    })
  });

});