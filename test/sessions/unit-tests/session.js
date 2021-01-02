import test from 'ava';

const { proto } = require('@tum-far/ubii-msg-formats');
const SessionStatus = proto.ubii.sessions.SessionStatus;

import { Session } from '../../../src/index.js';

import { MockIOMapping } from '../../mocks/mock-io-mapping.js';
import { MockProcessingModuleManager } from '../../mocks/mock-processing-module-manager.js';
import MockProcessingModule from '../../mocks/mock-processing-module.js';
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
  t.context.mockIOMappings = [];
  t.context.mockIOMappings.push(new MockIOMapping());
  t.context.mockIOMappings.push(new MockIOMapping());
  t.context.mockIOMappings.push(new MockIOMapping());

  t.context.topicData = new MockTopicData();

  t.context.mockProcessingModuleManager = new MockProcessingModuleManager();

  t.context.session = new Session(
    {},
    t.context.topicData,
    undefined,
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

  session = new Session({ ioMappings: ioMappings });
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
