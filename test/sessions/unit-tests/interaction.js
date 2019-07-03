import test from 'ava';

import {Interaction} from '../../../src/index';
import Utils from '../../../src/sessions/utilities';
import MockTopicData from '../../mocks/mock-topicdata.js';
import sinon from 'sinon';


test.beforeEach(t => {
  t.context.interaction = new Interaction({});
  t.context.topicData = new MockTopicData();

  t.context.interactionSpecs = {
    id: 'test-id',
    name: 'test-name',
    processingCallback: '() => {}',
    inputFormats: [
      {
        internalName: 'input1',
        messageFormat: 'messageFormat1'
      },
      {
        internalName: 'input2',
        messageFormat: 'messageFormat2'
      }
    ],
    outputFormats: [
      {
        internalName: 'output1',
        messageFormat: 'messageFormat3'
      },
      {
        internalName: 'output2',
        messageFormat: 'messageFormat4'
      }
    ]
  };
});

/* run tests */

test('constructor() - no params', t => {
  let interaction = t.context.interaction;
  t.is(typeof interaction.id, 'string');
  t.not(interaction.id, '');
  t.is(interaction.topicData, undefined);
  t.is(interaction.processingCallback, undefined);
});

test('constructor() - with specs', t => {
  let specs = t.context.interactionSpecs;
  let interaction = new Interaction(specs);
  interaction.setTopicData(t.context.topicData);
  t.is(interaction.id, specs.id);
  t.is(interaction.name, specs.name);
  t.deepEqual(interaction.processingCallback.toString(), specs.processingCallback);
  t.is(interaction.topicData, t.context.topicData);
  t.is(interaction.inputFormats, specs.inputFormats);
  t.is(interaction.outputFormats, specs.outputFormats);
  t.deepEqual(interaction.state, {});
});

test('setTopicData()', t => {
  let interaction = t.context.interaction;
  let topicData = {};
  interaction.setTopicData(topicData);
  t.is(interaction.topicData, topicData);
});

test('connectInputTopic()', t => {
  let interaction = t.context.interaction;

  let inputName = 'inputName';
  let topicName = 'topicName';

  // no topic data defined yet
  t.is(interaction.inputProxy[inputName], undefined);
  interaction.connectInputTopic(inputName, topicName);
  t.is(interaction.inputProxy[inputName], undefined);

  // defined topic data, but topic undefined
  let topicData = {
    pull: sinon.fake()
  };
  interaction.setTopicData(topicData);
  interaction.connectInputTopic(inputName, topicName);
  t.is(interaction.inputProxy[inputName], undefined);
  t.is(topicData.pull.callCount, 1);

  // defined topic data
  topicData.pull = sinon.fake.returns({data: 0, type: 'number'});
  interaction.connectInputTopic(inputName, topicName);
  t.not(interaction.inputProxy[inputName], null);
  t.is(topicData.pull.callCount, 2);
  t.is(topicData.pull.lastArg, topicName);
});

test('disconnectInputTopic()', t => {
  let interaction  = t.context.interaction;

  let inputName = 'inputName';
  interaction.inputProxy[inputName] = {};
  interaction.disconnectInputTopic(inputName);
  t.is(interaction.inputProxy[inputName], undefined);
});

test('connectOutputTopic()', t => {
  let interaction = new Interaction(t.context.interactionSpecs);

  let outputName = interaction.outputFormats[0].internalName;
  let topicName = 'topicName';
  let dataType = Utils.getTopicDataTypeFromMessageFormat(interaction.outputFormats[0].messageFormat);

  // no topic data defined yet
  t.is(interaction.outputProxy[outputName], undefined);
  interaction.connectOutputTopic(outputName, topicName);
  t.is(interaction.outputProxy[outputName], undefined);

  // defined topic data
  let topicData = {
    publish: sinon.fake()
  };
  interaction.setTopicData(topicData);
  interaction.connectOutputTopic(outputName, topicName);

  let value = 'test-value';
  interaction.outputProxy[outputName] = value;
  t.is(topicData.publish.callCount, 1);
  t.deepEqual(topicData.publish.lastCall.args, [topicName, value, dataType]);
});

test('disconnectOutputTopic()', t => {
  let interaction  = t.context.interaction;

  let outputName = 'outputName';
  interaction.outputProxy[outputName] = {};
  interaction.disconnectOutputTopic(outputName);
  t.is(interaction.outputProxy[outputName], undefined);
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

