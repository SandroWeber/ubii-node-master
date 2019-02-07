import test from 'ava';

import {SessionManager, Session} from '../../../src/index.js'
import {Cause, Effect, Interaction} from '@tum-far/ubii-interactions'
import {RuntimeTopicData} from '@tum-far/ubii-topic-data'


/* utility */

let topicNameInteger = 'deviceA->integerTopic';
let topicNameString = 'deviceB->stringTopic';

let cause2IntegerCondition = 42;

let wait = (milliseconds) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, milliseconds);
    });
};

/* an interaction always triggering and increasing a counter in state */
let setupInteraction1 = (topicData) => {
    let cause = new Cause();
    cause.setCallback((input, state) => {
        return true;
    });

    let effect = new Effect();
    effect.setCallback((output, state) => {
        if (state.counter === undefined) {
            state.counter = 0;
        } else {
            state.counter = state.counter + 1;
        }
    });

    let interaction = new Interaction(topicData);
    interaction.addCause(cause);
    interaction.addEffect(effect);

    return interaction;
};

/* an interaction working with input, output and state */
let setupInteraction2 = (topicData) => {
    let cause = new Cause();
    cause.setCallback((input, state) => {
        if (input.integer === 42 && state.triggerToggle) {
            state.triggerToggle = false;
            return true;
        } else {
            return false;
        }
    });

    let effect = new Effect();
    effect.setCallback((output, state) => {
        state.outputNumber = state.outputNumber + 1;
        output.string = state.outputNumber.toString();
    });

    let interaction = new Interaction(topicData);
    interaction.addCause(cause);
    interaction.addEffect(effect);
    interaction.state.triggerToggle = true;
    interaction.state.outputNumber = 0;

    interaction.connectInput('integer', topicNameInteger);
    interaction.connectOutput('string', topicNameString);

    return interaction;
};

let getGenericTopicInputBool = (session, interaction) => {
    return session.id + '->' + interaction.id +  '->' + 'InputBool';
};

let getGenericTopicOutputString = (session, interaction) => {
    return session.id + '->' + interaction.id +  '->' + 'OutputString';
};

let setupGenericInteractions = (session, count, topicData) => {
    for (let i = 0; i < count; i = i + 1) {
        let cause = new Cause();
        cause.setCallback((input, state) => {
            state.counter = state.counter+1;
            return (input.bool && state.counter % (i + 1) === 0);
        });

        let effect = new Effect();
        effect.setCallback((output, state) => {
            output.string = state.counter.toString();
        });

        let interaction = new Interaction(topicData);
        interaction.addCause(cause);
        interaction.addEffect(effect);
        interaction.state.counter = 0;

        interaction.connectInput('bool', getGenericTopicInputBool(session, interaction));
        interaction.connectOutput('string', getGenericTopicOutputString(session, interaction));

        session.addInteraction(interaction);
    }
};

/* test setup */

test.beforeEach(t => {
    t.context.sessionManager = new SessionManager();
    t.context.topicData = new RuntimeTopicData();
});


/* run tests */

test('single session - two interactions', async t => {
    let sessionManager = t.context.sessionManager;
    let topicData = t.context.topicData;

    let session = sessionManager.createSession();

    let interaction1 = setupInteraction1(topicData);
    session.addInteraction(interaction1);

    let interaction2 = setupInteraction2(topicData);
    session.addInteraction(interaction2);

    let topicIntegerTarget = 21;
    topicData.publish(topicNameInteger, topicIntegerTarget);
    topicData.publish(topicNameString, '0');

    // start
    sessionManager.startAllSessions();
    t.is(session.status === Session.STATUS.RUNNING, true);

    // wait until t1
    await wait(500);
    // interaction1 at t1
    let counterT1 = interaction1.state.counter;
    t.is(counterT1 > 0, true);
    // interaction2 at t1
    t.is(interaction2.state.outputNumber, 0);
    t.is(interaction2.state.triggerToggle, true);
    // topicData at t1
    t.is(topicData.pull(topicNameInteger), topicIntegerTarget);
    t.is(topicData.pull(topicNameString), '0');

    // wait until t2
    await wait(50);
    topicData.publish(topicNameInteger, cause2IntegerCondition);
    await wait(50);
    topicData.publish(topicNameInteger, topicIntegerTarget);
    await wait(50);
    // interaction1 at t2
    let counterT2 = interaction1.state.counter;
    t.is(counterT2 > counterT1, true);
    // interaction2 at t2
    t.is(interaction2.state.outputNumber, 1);
    t.is(interaction2.state.triggerToggle, false);
    // topicData at t2
    t.is(topicData.pull(topicNameInteger), topicIntegerTarget);
    t.is(topicData.pull(topicNameString), '1');

    // wait until t3
    topicIntegerTarget = -50;
    await wait(50);
    topicData.publish(topicNameInteger, cause2IntegerCondition);
    await wait(50);
    topicData.publish(topicNameInteger, topicIntegerTarget);
    await wait(50);
    // interaction1 at t3
    let counterT3 = interaction1.state.counter;
    t.is(counterT3 > counterT2, true);
    // interaction2 at t3
    t.is(interaction2.state.outputNumber, 1);
    t.is(interaction2.state.triggerToggle, false);
    // topicData at t3
    t.is(topicData.pull(topicNameInteger), topicIntegerTarget);
    t.is(topicData.pull(topicNameString), '1');

    // wait until t4
    topicIntegerTarget = 0;
    interaction2.state.triggerToggle = true;
    await wait(50);
    topicData.publish(topicNameInteger, 42);
    await wait(50);
    topicData.publish(topicNameInteger, topicIntegerTarget);
    await wait(50);
    // interaction1 at t4
    let counterT4 = interaction1.state.counter;
    t.is(counterT4 > counterT3, true);
    // interaction2 at t4
    t.is(interaction2.state.outputNumber, 2);
    t.is(interaction2.state.triggerToggle, false);
    // topicData at t4
    t.is(topicData.pull(topicNameInteger), topicIntegerTarget);
    t.is(topicData.pull(topicNameString), '2');

    // stop
    sessionManager.stopAllSessions();
    t.is(session.status === Session.STATUS.STOPPED, true);
});

test('two sessions - one interaction each', async t => {
    let sessionManager = t.context.sessionManager;
    let topicData = t.context.topicData;

    let session1 = sessionManager.createSession();
    let session2 = sessionManager.createSession();

    let interaction1 = setupInteraction1(topicData);
    session1.addInteraction(interaction1);

    let interaction2 = setupInteraction2(topicData);
    session2.addInteraction(interaction2);

    let topicIntegerTarget = 21;
    topicData.publish(topicNameInteger, topicIntegerTarget);
    topicData.publish(topicNameString, '0');

    // start
    sessionManager.startAllSessions();
    t.is(session1.status === Session.STATUS.RUNNING, true);
    t.is(session2.status === Session.STATUS.RUNNING, true);

    // wait until t1
    await wait(100);
    // interaction1 at t1
    let counterT1 = interaction1.state.counter;
    t.is(counterT1 > 0, true);
    // interaction2 at t1
    t.is(interaction2.state.outputNumber, 0);
    t.is(interaction2.state.triggerToggle, true);
    // topicData at t1
    t.is(topicData.pull(topicNameInteger), topicIntegerTarget);
    t.is(topicData.pull(topicNameString), '0');

    // wait until t2
    await wait(50);
    topicData.publish(topicNameInteger, cause2IntegerCondition);
    await wait(50);
    topicData.publish(topicNameInteger, topicIntegerTarget);
    await wait(50);
    // interaction1 at t2
    let counterT2 = interaction1.state.counter;
    t.is(counterT2 > counterT1, true);
    // interaction2 at t2
    t.is(interaction2.state.outputNumber, 1);
    t.is(interaction2.state.triggerToggle, false);
    // topicData at t2
    t.is(topicData.pull(topicNameInteger), topicIntegerTarget);
    t.is(topicData.pull(topicNameString), '1');

    // wait until t3
    topicIntegerTarget = -50;
    await wait(50);
    topicData.publish(topicNameInteger, cause2IntegerCondition);
    await wait(50);
    topicData.publish(topicNameInteger, topicIntegerTarget);
    await wait(50);
    // interaction1 at t3
    let counterT3 = interaction1.state.counter;
    t.is(counterT3 > counterT2, true);
    // interaction2 at t3
    t.is(interaction2.state.outputNumber, 1);
    t.is(interaction2.state.triggerToggle, false);
    // topicData at t3
    t.is(topicData.pull(topicNameInteger), topicIntegerTarget);
    t.is(topicData.pull(topicNameString), '1');

    // wait until t4
    topicIntegerTarget = 0;
    interaction2.state.triggerToggle = true;
    await wait(50);
    topicData.publish(topicNameInteger, cause2IntegerCondition);
    await wait(50);
    topicData.publish(topicNameInteger, topicIntegerTarget);
    await wait(50);
    // interaction1 at t4
    let counterT4 = interaction1.state.counter;
    t.is(counterT4 > counterT3, true);
    // interaction2 at t4
    t.is(interaction2.state.outputNumber, 2);
    t.is(interaction2.state.triggerToggle, false);
    // topicData at t4
    t.is(topicData.pull(topicNameInteger), topicIntegerTarget);
    t.is(topicData.pull(topicNameString), '2');

    // stop
    sessionManager.stopAllSessions();
    t.is(session1.status === Session.STATUS.STOPPED, true);
    t.is(session2.status === Session.STATUS.STOPPED, true);
});

test('100 generic sessions with 100 generic interactions each', async t => {
    let sessionManager = t.context.sessionManager;
    let topicData = t.context.topicData;

    let sessionCount = 100;
    let waitTimePerSession = 20;
    for (let i=0; i < sessionCount; i=i+1) {
        let session = sessionManager.createSession();
        setupGenericInteractions(session, 100, topicData);
    }

    sessionManager.startAllSessions();
    sessionManager.sessions.forEach((session) => {
        t.is(session.status, Session.STATUS.RUNNING);
    });

    await wait(sessionCount * waitTimePerSession);
    
    // nothing published on input topics yet, ouput topics should all still be undefined
    sessionManager.sessions.forEach((session) => {
        session.interactionIOMappings.forEach((mapping) => {
            t.is(mapping.interaction.state.counter > 0, true);
            t.is(topicData.pull(getGenericTopicOutputString(session, mapping.interaction)), undefined);
        })
    });

    // set all input bools to true
    sessionManager.sessions.forEach((session) => {
        session.interactionIOMappings.forEach((mapping) => {
            topicData.publish(getGenericTopicInputBool(session, mapping.interaction), true);
        })
    });
    await wait(sessionCount * waitTimePerSession);
    // nothing published on input topics yet, counters and ouput topics should all still be at 0
    sessionManager.sessions.forEach((session) => {
        session.interactionIOMappings.forEach((mapping) => {
            t.is(mapping.interaction.state.counter > 0, true);
            t.is(topicData.pull(getGenericTopicOutputString(session, mapping.interaction)) !== '0', true);
        })
    });

});