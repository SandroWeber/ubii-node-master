import test from 'ava';
import { DeviceManager } from '../../src/index.js';
import { Participant } from '../../src/index.js';
import { Watcher } from '../../src/index.js';
import { ServerMock } from '../mocks/serverMock';
import { TopicDataMock, createDeviceSpecificationMock } from '../mocks/serverMockDevices';
import { ClientMock } from '../mocks/clientMock';
import { ClientManagerMock } from '../mocks/clientManagerMock';

(function () {
  // Helpers:

  let addDummyEntriesToDeviceManager = function (context) {
    context.deviceManager.participants.set(
      '00000000-0000-0000-0000-000000000000',
      new Participant(
        { id: '00000000-0000-0000-0000-000000000000', name: 'dummyId' },
        context.clientMock,
        context.topicDataMock
      )
    );

    context.deviceManager.watchers.set(
      '11111111-1111-1111-1111-111111111111',
      new Watcher(
        { id: '11111111-1111-1111-1111-111111111111', name: 'dummyId' },
        context.clientMock,
        context.topicDataMock
      )
    );
  };

  // Preparation:

  test.beforeEach((t) => {
    t.context.topicDataMock = new TopicDataMock();
    t.context.serverMock = new ServerMock();
    t.context.clientMock = new ClientMock();
    t.context.deviceManager = DeviceManager.instance;
    t.context.deviceManager.setTopicData(t.context.topicDataMock);
  });

  // Test cases:

  // Participant test cases:

  test('hasParticipant', (t) => {
    addDummyEntriesToDeviceManager(t.context);

    t.true(t.context.deviceManager.hasParticipant('00000000-0000-0000-0000-000000000000'));
  });

  test('addParticipant', (t) => {
    let participant = new Participant({}, t.context.clientMock, t.context.topicDataMock);
    t.context.deviceManager.addParticipant(participant);

    t.true(t.context.deviceManager.participants.has(participant.id));
  });

  test('getParticipant', (t) => {
    let dummy = new Participant({}, t.context.clientMock, t.context.topicDataMock);
    t.context.deviceManager.addParticipant(dummy);

    let returnedParticipant = t.context.deviceManager.getParticipant(dummy.id);

    t.deepEqual(dummy, returnedParticipant);
  });

  test('removeParticipant', (t) => {
    addDummyEntriesToDeviceManager(t.context);

    t.context.deviceManager.removeParticipant('00000000-0000-0000-0000-000000000000');

    t.true(!t.context.deviceManager.participants.has('00000000-0000-0000-0000-000000000000'));
  });

  test('verifyParticipant', (t) => {
    let dummy = new Participant({}, t.context.clientMock, t.context.topicDataMock);
    t.context.deviceManager.addParticipant(dummy);

    t.true(t.context.deviceManager.verifyParticipant(dummy.id));
  });

  test('basic participants map operations', (t) => {
    t.notThrows(() => {
      let dummyParticipant = new Participant({}, t.context.clientMock, t.context.topicDataMock);

      t.context.deviceManager.addParticipant(dummyParticipant);

      t.true(t.context.deviceManager.hasParticipant(dummyParticipant.id));

      let returnedParticipant = t.context.deviceManager.getParticipant(dummyParticipant.id);

      t.deepEqual(dummyParticipant, returnedParticipant);

      t.context.deviceManager.removeParticipant(dummyParticipant.id);

      t.false(t.context.deviceManager.hasParticipant(dummyParticipant.id));
    });
  });

  // Watcher test cases:

  test('hasWatcher', (t) => {
    addDummyEntriesToDeviceManager(t.context);

    t.true(t.context.deviceManager.hasWatcher('11111111-1111-1111-1111-111111111111'));
  });

  test('addWatcher', (t) => {
    let watcher = new Watcher({}, t.context.clientMock, t.context.topicDataMock);
    t.context.deviceManager.addWatcher(watcher);

    t.true(t.context.deviceManager.watchers.has(watcher.id));
  });

  test('getWatcher', (t) => {
    let dummy = new Watcher(
      { id: '11111111-1111-1111-1111-111111111111', name: 'dummyId' },
      t.context.clientMock,
      t.context.topicDataMock
    );
    t.context.deviceManager.watchers.set('11111111-1111-1111-1111-111111111111', dummy);

    let returnedWatcher = t.context.deviceManager.getWatcher(
      '11111111-1111-1111-1111-111111111111'
    );

    t.deepEqual(dummy, returnedWatcher);
  });

  test('removeWatcher', (t) => {
    addDummyEntriesToDeviceManager(t.context);

    t.context.deviceManager.removeWatcher('11111111-1111-1111-1111-111111111111');

    t.true(!t.context.deviceManager.watchers.has('11111111-1111-1111-1111-111111111111'));
  });

  test('registerWatcher', (t) => {
    t.context.deviceManager.registerWatcher(
      new Watcher(
        { id: '11111111-1111-1111-1111-111111111111', name: 'dummyId' },
        t.context.clientMock,
        t.context.topicDataMock
      )
    );

    t.true(t.context.deviceManager.watchers.has('11111111-1111-1111-1111-111111111111'));
  });

  test('verifyWatcher', (t) => {
    addDummyEntriesToDeviceManager(t.context);

    t.true(t.context.deviceManager.verifyWatcher('11111111-1111-1111-1111-111111111111'));
  });

  test('basic watchers map operations', (t) => {
    t.notThrows(() => {
      let dummyWatcher = new Watcher(
        { id: '11111111-1111-1111-1111-111111111111', name: 'dummyId' },
        t.context.clientMock,
        t.context.topicDataMock
      );

      t.context.deviceManager.addWatcher(dummyWatcher);

      t.true(t.context.deviceManager.hasWatcher('11111111-1111-1111-1111-111111111111'));

      let returnedWatcher = t.context.deviceManager.getWatcher(
        '11111111-1111-1111-1111-111111111111'
      );

      t.deepEqual(dummyWatcher, returnedWatcher);

      t.context.deviceManager.removeWatcher('11111111-1111-1111-1111-111111111111');

      t.true(!t.context.deviceManager.hasWatcher('11111111-1111-1111-1111-111111111111'));
    });
  });

  // General test cases:

  test('registerDeviceSpecs', (t) => {
    let deviceRegistration = createDeviceSpecificationMock('uniqueId', 0);

    let result = t.context.deviceManager.registerDeviceSpecs(deviceRegistration);

    t.is(result.error, undefined);
    t.is(result.id, 'uniqueId');
  });
})();
