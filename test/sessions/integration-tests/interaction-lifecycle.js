import test from 'ava';
import uuidv4 from 'uuid/v4';

import TestUtility from '../testUtility';
import Utils from '../../../src/utilities';

import { SessionManager, DeviceManager } from '../../../src/index';
import { RuntimeTopicData } from '@tum-far/ubii-topic-data';

/* helper functions */

let processCB = () => { };
let onCreated = (state) => {
  state.bool = true;
  state.string = 'test-string';
};

let interactionSpecs = {
  id: uuidv4(),
  name: 'test-interaction',
  processingCallback: processCB.toString(),
  onCreated: onCreated.toString()
};

let sessionSpecs = {
  name: 'test-session',
  interactions: [interactionSpecs]
};

/* initialize tests */

test.beforeEach(t => {
  t.context.topicData = new RuntimeTopicData();
  t.context.deviceManager = new DeviceManager(undefined, t.context.topicData, undefined);
  t.context.sessionManager = new SessionManager(t.context.topicData, t.context.deviceManager);
});


/* run tests */

test('onCreated', async t => {
  let session = t.context.sessionManager.createSession(sessionSpecs);
  await t.context.sessionManager.startAllSessions();
  t.is(session.runtimeInteractions.length, 1);
  t.is(session.runtimeInteractions[0].state.bool, true);
  t.is(session.runtimeInteractions[0].state.string, 'test-string');
});