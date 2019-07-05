import test from 'ava';
import uuidv4 from 'uuid/v4';

import TestUtility from '../testUtility';
import Utils from '../../../src/utilities';

import { SessionManager, DeviceManager } from '../../../src/index';
import { RuntimeTopicData } from '@tum-far/ubii-topic-data';

let inputTopicSuffix = '/input/double';
let outputTopicSuffix = '/output/string';

/* helper functions */
let generateInputList = (count) => {
  let list = [];
  for (let i = 0; i < count; i++) {
    list.push({
      uuid: uuidv4(),
      value: Math.random()
    });
  }

  return list;
};
//let uuidv4Regex = '[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}';

let topicMuxSpecs = {
  name: 'test-mux',
  dataType: 'double',
  topicSelector: '/' + Utils.getUUIDv4Regex() + inputTopicSuffix,
  identityMatchPattern: Utils.getUUIDv4Regex()
};

let topicDemuxSpecs = {
  name: 'test-demux',
  dataType: 'string',
  outputTopicFormat: '/%s' + outputTopicSuffix
};

let processCB = (inputs, outputs, state) => {
  let muxRecords = inputs.mux;

  let outputList = [];
  muxRecords.forEach((record) => {
    let value = record.data < 0.5 ? 'low' : 'high';
    outputList.push({
      data: value,
      outputTopicParams: [record.identity]
    });
  });

  outputs.demux = outputList;
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
  }]
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

let publishInput = (inputList, topicData) => {
  inputList.forEach(input => {
    let topic = '/' + input.uuid + inputTopicSuffix;
    topicData.publish(topic, input.value, topicMuxSpecs.dataType);
  });
}

/* initialize tests */

test.beforeEach(t => {
  t.context.topicData = new RuntimeTopicData();
  t.context.deviceManager = new DeviceManager(undefined, t.context.topicData, undefined);
  t.context.sessionManager = new SessionManager(t.context.topicData, t.context.deviceManager);
});


/* run tests */

test('publish first, start session', async t => {
  let inputList = generateInputList(10);
  publishInput(inputList, t.context.topicData);

  t.context.sessionManager.createSession(sessionSpecs);
  t.context.sessionManager.startAllSessions();
  await TestUtility.wait(10);
  t.context.sessionManager.stopAllSessions();

  inputList.forEach(input => {
    let expected = input.value < 0.5 ? 'low' : 'high';
    let outputTopic = '/' + input.uuid + outputTopicSuffix;
    t.is(t.context.topicData.pull(outputTopic).data, expected);
  });
});