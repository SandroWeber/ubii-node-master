import test from 'ava';
import sinon from 'sinon';

import { SessionManager, Session } from '../../../src/index';

import MockTopicData from '../../mocks/mock-topicdata.js';
import MockProcessingModuleManager from '../../mocks/mock-processing-module-manager';

/* utility functions */

let getRandomInt = (max) => {
  return Math.floor(Math.random() * Math.floor(max));
};

let createSessions = (sessionManager, count) => {
  for (let i = 0; i < count; i = i + 1) {
    let session = sessionManager.createSession();
    session.start = sinon.fake();
    session.stop = sinon.fake();
  }
};

let getRandomSession = (sessionManager) => {
  let index = getRandomInt(sessionManager.sessions.length - 1);
  return sessionManager.sessions[index];
};

/* test setup */

test.beforeEach((t) => {
  t.context.nodeID = 'test-node-id-session-manager';
  t.context.mockTopicData = new MockTopicData();
  t.context.mockProcessingModuleManager = new MockProcessingModuleManager();
  t.context.sessionManager = new SessionManager(
    t.context.nodeID,
    t.context.mockTopicData,
    undefined,
    t.context.mockProcessingModuleManager
  );
});

/* run tests */

test('constructor', (t) => {
  t.is(t.context.sessionManager !== null, true);
  t.is(t.context.sessionManager.sessions.length, 0);
});

test('createSession', (t) => {
  let sessionManager = t.context.sessionManager;

  let numberOfSessions = 16;
  createSessions(sessionManager, numberOfSessions);
  t.is(sessionManager.sessions.length, numberOfSessions);
});

test('addSession', (t) => {
  let sessionManager = t.context.sessionManager;

  let numberOfSessions = 16;
  for (let i = 0; i < numberOfSessions; i = i + 1) {
    let session = new Session({});
    sessionManager.addSession(session);
  }
  t.is(sessionManager.sessions.length, numberOfSessions);
});

test('removeSession', (t) => {
  let sessionManager = t.context.sessionManager;

  createSessions(sessionManager, 16);

  while (sessionManager.sessions.length > 0) {
    let index = getRandomInt(sessionManager.sessions.length - 1);
    sessionManager.removeSession(sessionManager.sessions[index].id);
  }
  t.is(sessionManager.sessions.length, 0);
});

test('getSession', (t) => {
  let sessionManager = t.context.sessionManager;

  createSessions(sessionManager, 16);

  let randomSession = getRandomSession(sessionManager);
  let session = sessionManager.getSession(randomSession.id);
  t.deepEqual(session, randomSession);
});

test('startSession', (t) => {
  let sessionManager = t.context.sessionManager;

  createSessions(sessionManager, 16);
  let randomSession = getRandomSession(sessionManager);
  randomSession.start = sinon.fake();

  sessionManager.startSessionByID(randomSession.id);
  t.is(randomSession.start.callCount, 1);
});

test('startAllSessions', (t) => {
  let sessionManager = t.context.sessionManager;

  createSessions(sessionManager, 16);

  sessionManager.startAllSessions();

  sessionManager.sessions.forEach((session) => {
    t.is(session.start.callCount, 1);
  });
});

test('stopSession', (t) => {
  let sessionManager = t.context.sessionManager;

  createSessions(sessionManager, 16);
  let randomSession = getRandomSession(sessionManager);

  sessionManager.stopSessionByID(randomSession.id);
  t.is(randomSession.stop.callCount, 1);
});

test('stopAllSessions', (t) => {
  let sessionManager = t.context.sessionManager;

  createSessions(sessionManager, 16);

  sessionManager.stopAllSessions();

  sessionManager.sessions.forEach((session) => {
    t.is(session.stop.callCount, 1);
  });
});
