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

test('add/remove processing modules', (t) => {
  let session = t.context.session;

  let pm1 = new MockProcessingModule();
  let pm2 = new MockProcessingModule();

  t.is(session.runtimeProcessingModules.length, 0);
  t.true(session.addProcessingModule(pm1));
  t.true(session.addProcessingModule(pm2));
  t.is(session.runtimeProcessingModules.length, 2);

  // try adding the same module twice
  t.false(session.addProcessingModule(pm1));
  t.is(session.runtimeProcessingModules.length, 2);

  // remove one
  t.true(session.removeProcessingModule(pm1));
  t.is(session.runtimeProcessingModules.length, 1);
  // try removing the same element
  t.false(session.removeProcessingModule(pm1));
  t.is(session.runtimeProcessingModules.length, 1);
});

test('start', async (t) => {
  let session = t.context.session;

  let pm1 = new MockProcessingModule();
  let pm2 = new MockProcessingModule();
  let pm3 = new MockProcessingModule();
  t.true(session.addProcessingModule(pm1));
  t.true(session.addProcessingModule(pm2));
  t.true(session.addProcessingModule(pm3));

  t.is(pm1.start.callCount, 0);
  t.is(pm2.start.callCount, 0);
  t.is(pm3.start.callCount, 0);

  await runProcessing(session, 100);

  t.true(pm1.start.callCount > 0);
  t.true(pm2.start.callCount > 0);
  t.true(pm3.start.callCount > 0);

  // start, then try to start again while already running
  t.true(session.start());
  t.is(session.status, SessionStatus.RUNNING);
  t.false(session.start());
});

test('stop', async (t) => {
  let session = t.context.session;

  let pm1 = new MockProcessingModule();
  t.true(session.addProcessingModule(pm1));

  t.is(session.status, SessionStatus.CREATED);
  t.false(session.stop());
  t.true(session.start());
  t.is(pm1.start.callCount, 1);
  t.is(session.status, SessionStatus.RUNNING);
  t.true(session.stop());
  t.is(pm1.stop.callCount, 1);
});
