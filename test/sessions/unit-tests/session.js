import test from 'ava';

import { Session } from '../../../src/index.js';

import { MockIOMapping } from '../../mocks/mock-io-mapping.js';
import MockProcessingModuleManager from '../../mocks/mock-processing-module-manager.js';
import MockTopicData from '../../mocks/mock-topicdata.js';

let runProcessing = (session, milliseconds) => {
  return new Promise((resolve, reject) => {
    session.start();
    setTimeout(() => {
      session.stop();
      resolve();
    }, milliseconds);
  });
};

test.beforeEach((t) => {
  t.context.nodeID = 'test-node-id-sessions';
  t.context.mockIOMappings = [];
  t.context.mockIOMappings.push(new MockIOMapping());
  t.context.mockIOMappings.push(new MockIOMapping());
  t.context.mockIOMappings.push(new MockIOMapping());

  t.context.mockTopicData = new MockTopicData();
  t.context.mockProcessingModuleManager = new MockProcessingModuleManager();

  t.context.session = new Session(
    {},
    t.context.nodeID,
    t.context.mockTopicData,
    t.context.mockProcessingModuleManager
  );
});

/* run tests */

test('constructor', (t) => {
  let session = t.context.session;
  let ioMappings = t.context.mockIOMappings;

  t.is(typeof session.id, 'string');
  t.not(session.id, '');
  t.is(session.ioMappings.length, 0);

  session = new Session(
    { ioMappings: ioMappings },
    t.context.nodeID,
    t.context.mockTopicData,
    t.context.mockProcessingModuleManager
  );
  t.is(typeof session.id, 'string');
  t.not(session.id, '');
  t.is(session.ioMappings.length, ioMappings.length);
});

test('start', async (t) => {
  //TODO: rewrite
});

test('stop', async (t) => {
  //TODO: rewrite
});
