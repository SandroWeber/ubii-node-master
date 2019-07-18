import test from 'ava';
import uuidv4 from 'uuid/v4';

import TestUtility from '../testUtility';
import Utils from '../../../src/utilities';

import { SessionManager, DeviceManager } from '../../../src/index';
import { RuntimeTopicData } from '@tum-far/ubii-topic-data';

/* helper functions */

let processCB = (inputs, outputs, state) => { };
let onCreated = () => {
  this.state.bool = true;
  this.state.string = 'test-string';
};

let interactionSpecs = {
  id: uuidv4(),
  name: 'test-interaction',
  processingCallback: processCB.toString(),
  inputFormats: [{
    internalName: 'mux',
    messageFormat: 'double'
  }],
  outputFormats: [{
    internalName: 'demux',
    messageFormat: 'string'
  }],
  onCreated: onCreated.toString()
};

let sessionSpecs = {
  name: 'test-session',
  interactions: [interactionSpecs],
  ioMappings: [{
    interactionId: interactionSpecs.id,
    inputMappings: [{
      name: interactionSpecs.inputFormats[0].internalName,
      topicSource: topicMuxSpecs
    }],
    outputMappings: [{
      name: interactionSpecs.outputFormats[0].internalName,
      topicDestination: topicDemuxSpecs
    }]
  }]
};

/* initialize tests */

test.beforeEach(t => {
  t.context.topicData = new RuntimeTopicData();
  t.context.deviceManager = new DeviceManager(undefined, t.context.topicData, undefined);
  t.context.sessionManager = new SessionManager(t.context.topicData, t.context.deviceManager);
});


/* run tests */

test('execute interaction with TFjs example code', async t => {
  let session = t.context.sessionManager.createSession(sessionSpecs);
  t.is(session.runtimeInteractions.length, 1);
});