import test from 'ava';

import {Interaction} from '../../../src/index';
import MockTopicData from '../../mocks/mock-topicdata.js';
import sinon from 'sinon';


test.beforeEach(t => {
  t.context.interaction = new Interaction({});
  t.context.topicData = new MockTopicData();
});

/* run tests */

test('constructor() - no params', t => {
  let interaction = t.context.interaction;
  t.is(typeof interaction.id, 'string');
  t.not(interaction.id, '');
  t.is(interaction.topicData, undefined);
  t.is(interaction.processingCallback, undefined);
});

test('constructor() - with params', t => {
  let params = {
    id: 'test-id',
    name: 'test-name',
    processingCallback: '() => {}',
    inputFormats: [],
    outputFormats: []
  };
  let interaction = new Interaction(params);
  interaction.setTopicData(t.context.topicData);
  t.is(interaction.id, params.id);
  t.is(interaction.name, params.name);
  t.deepEqual(interaction.processingCallback.toString(), params.processingCallback);
  t.is(interaction.topicData, t.context.topicData);
  t.is(interaction.inputFormats, params.inputFormats);
  t.is(interaction.outputFormats, params.outputFormats);
  t.deepEqual(interaction.state, {});
});

test('setTopicData()', t => {
  let interaction = t.context.interaction;
  let topicData = {};
  interaction.setTopicData(topicData);
  t.is(interaction.topicData, topicData);
});

test('connectInput()', t => {
  let interaction = t.context.interaction;

  let inputName = 'inputName';
  let topicName = 'topicName';

  // no topic data defined yet
  t.is(interaction.inputProxy[inputName], undefined);
  interaction.connectInput(inputName, topicName);
  t.is(interaction.inputProxy[inputName], undefined);

  // defined topic data, but topic undefined
  let topicData = {
    pull: sinon.fake()
  };
  interaction.setTopicData(topicData);
  interaction.connectInput(inputName, topicName);
  t.is(interaction.inputProxy[inputName], undefined);
  t.is(topicData.pull.callCount, 1);

  // defined topic data
  topicData.pull = sinon.fake.returns({data: 0, type: 'number'});
  interaction.connectInput(inputName, topicName);
  t.not(interaction.inputProxy[inputName], null);
  t.is(topicData.pull.callCount, 2);
  t.is(topicData.pull.lastArg, topicName);
});

test('disconnectInput()', t => {
  let interaction  = t.context.interaction;

  let inputName = 'inputName';
  interaction.inputProxy[inputName] = {};
  interaction.disconnectInput(inputName);
  t.is(interaction.inputProxy[inputName], undefined);
});

test('connectOutput()', t => {
  let interaction = t.context.interaction;

  let outputName = 'outputName';
  let topicName = 'topicName';
  let type = 'type';

  // no topic data defined yet
  t.is(interaction.outputProxy[outputName], undefined);
  interaction.connectOutput(outputName, topicName);
  t.is(interaction.outputProxy[outputName], undefined);

  // defined topic data
  let topicData = {
    publish: sinon.fake()
  };
  interaction.setTopicData(topicData);
  interaction.connectOutput(outputName, topicName, type);

  let value = 'test-value';
  interaction.outputProxy[outputName] = value;
  t.is(topicData.publish.callCount, 1);
  t.deepEqual(topicData.publish.lastCall.args, [topicName, value, type]);
});

test('disconnectOutput()', t => {
  let interaction  = t.context.interaction;

  let outputName = 'outputName';
  interaction.outputProxy[outputName] = {};
  interaction.disconnectOutput(outputName);
  t.is(interaction.outputProxy[outputName], undefined);
});

test('connectIO()', t => {
  let interaction  = t.context.interaction;

  interaction.connectInput = sinon.fake();
  interaction.connectOutput = sinon.fake();

  let input1 = {internalName: 'input-1', messageFormat: ''},
    topicInput1 = 'topic-input-1',
    output1 = {internalName: 'output-1', messageFormat: ''},
    topicOutput1 = 'topic-output-1';
  interaction.inputFormats.push(input1);
  interaction.outputFormats.push(output1);

  let ioMappings = [];

  // no mappings
  interaction.connectIO(ioMappings);
  t.is(interaction.connectInput.callCount, 0);
  t.is(interaction.connectOutput.callCount, 0);

  // not well defined mappings
  ioMappings.push({
    interactionId: interaction.id,
    interactionInput: input1
  });
  ioMappings.push({
    interactionId: interaction.id,
    topic: topicOutput1
  });
  interaction.connectIO(ioMappings);
  t.is(interaction.connectInput.callCount, 0);
  t.is(interaction.connectOutput.callCount, 0);

  // well defined mappings
  ioMappings = [];
  ioMappings.push({
    interactionId: interaction.id,
    interactionInput: input1,
    topic: topicInput1
  });
  ioMappings.push({
    interactionId: interaction.id,
    interactionOutput: output1,
    topic: topicOutput1
  });
  interaction.connectIO(ioMappings);
  t.is(interaction.connectInput.callCount, 1);
  t.is(interaction.connectOutput.callCount, 1);
});

test('disconnectIO()', t => {
  let interaction  = t.context.interaction;

  interaction.inputProxy.a = 1;
  interaction.inputProxy.b = '2';
  interaction.outputProxy.a = 3;
  interaction.outputProxy.b = '4';

  interaction.disconnectIO();
  t.deepEqual(interaction.inputProxy, {});
  t.deepEqual(interaction.outputProxy, {});
});

test('setProcessingCallback()', t => {
  let interaction  = t.context.interaction;

  // not a function
  let callbackFunction = {};
  interaction.setProcessingCallback(callbackFunction);
  t.is(interaction.processingCallback, undefined);

  // a function
  callbackFunction = () => {};
  interaction.setProcessingCallback(callbackFunction);
  t.is(interaction.processingCallback, callbackFunction);
});

test('process()', t => {
  let interaction  = t.context.interaction;

  interaction.inputProxy = {
    a: 1,
    b: '2'
  };
  interaction.outputProxy = {
    c: 3,
    d: '4'
  };
  interaction.state = {
    e: 5,
    f: '6'
  };

  interaction.processingCallback = sinon.fake();
  interaction.process();
  t.deepEqual(interaction.processingCallback.lastCall.args, [interaction.inputProxy, interaction.outputProxy, interaction.state]);
});

