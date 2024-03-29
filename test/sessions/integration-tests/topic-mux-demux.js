import test from 'ava';
import uuidv4 from 'uuid/v4';

import TestUtility from '../../testUtility';
import Utils from '../../../src/utilities';

import {
  SessionManager,
  DeviceManager,
  ProcessingModuleManager,
  ClientManager
} from '../../../src/index';
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

const topicMuxSpecs = {
  name: 'test-mux',
  dataType: 'double',
  topicSelector: '/' + Utils.getUUIDv4Regex() + inputTopicSuffix,
  identityMatchPattern: Utils.getUUIDv4Regex()
};

const topicDemuxSpecs = {
  name: 'test-demux',
  dataType: 'string',
  outputTopicFormat: '/%s' + outputTopicSuffix
};

let processCB = (deltaT, inputs, outputs, state) => {
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

const processingModuleSpecs = {
  name: 'test-pm-topic-mux-demux',
  onProcessingStringified: processCB.toString(),
  inputs: [
    {
      internalName: 'mux',
      messageFormat: 'double'
    }
  ],
  outputs: [
    {
      internalName: 'demux',
      messageFormat: 'string'
    }
  ]
};

const sessionSpecs = {
  name: 'test-session',
  processingModules: [processingModuleSpecs],
  ioMappings: [
    {
      processingModuleName: processingModuleSpecs.name,
      inputMappings: [
        {
          inputName: processingModuleSpecs.inputs[0].internalName,
          topicSource: topicMuxSpecs
        }
      ],
      outputMappings: [
        {
          outputName: processingModuleSpecs.outputs[0].internalName,
          topicDestination: topicDemuxSpecs
        }
      ]
    }
  ]
};

let publishInput = (inputList, topicData) => {
  inputList.forEach((input) => {
    let topic = '/' + input.uuid + inputTopicSuffix;
    topicData.publish(topic, input.value, topicMuxSpecs.dataType);
  });
};

/* initialize tests */

test.beforeEach((t) => {
  t.context.nodeID = 'test-node-id-topic-mux-demux';
  t.context.topicData = new RuntimeTopicData();
  t.context.clientManager = new ClientManager(undefined, t.context.topicData);
  t.context.deviceManager = DeviceManager.instance;
  t.context.deviceManager.setTopicData(t.context.topicData);
  
  t.context.processingModuleManager = new ProcessingModuleManager(
    t.context.nodeID,
    t.context.deviceManager,
    t.context.topicData
  );
  t.context.sessionManager = new SessionManager(
    t.context.nodeID,
    t.context.topicData,
    t.context.deviceManager,
    t.context.processingModuleManager,
    t.context.clientManager
  );
});

test.afterEach((t) => {
  t.context.sessionManager.stopAllSessions();
});

/* run tests */

test('publish first, start session', async (t) => {
  let inputList = generateInputList(10);
  publishInput(inputList, t.context.topicData);

  t.context.sessionManager.createSession(sessionSpecs);
  t.context.sessionManager.startAllSessions();

  await TestUtility.wait(10);
  t.context.sessionManager.stopAllSessions();

  inputList.forEach((input) => {
    let expected = input.value < 0.5 ? 'low' : 'high';
    let outputTopic = '/' + input.uuid + outputTopicSuffix;
    t.is(t.context.topicData.pull(outputTopic).data, expected);
  });
});

test('start session first, then publish', async (t) => {
  t.context.sessionManager.createSession(sessionSpecs);
  t.context.sessionManager.startAllSessions();

  let inputList = generateInputList(10);
  publishInput(inputList, t.context.topicData);

  await TestUtility.wait(100);
  t.context.sessionManager.stopAllSessions();

  inputList.forEach((input) => {
    let expected = input.value < 0.5 ? 'low' : 'high';
    let outputTopic = '/' + input.uuid + outputTopicSuffix;
    t.is(t.context.topicData.pull(outputTopic).data, expected);
  });
});
