import test from 'ava';
import {
    DeviceManager
} from '../src/index.js';
import {
    Participant
} from '../src/devices/participant.js';
import {
    Watcher
} from '../src/devices/watcher.js';
import {
    ServerMock,
    TopicDataMock,
    createDeviceSpecificationMock
} from '../mocks/mocks.js';

(function () {

    // Helpers:

    let addDummyEntriesToDeviceManager = function(context) {
        context.deviceManager.participants.set('00000000-0000-0000-0000-000000000000', 
            new Participant('00000000-0000-0000-0000-000000000000',
                'dummyId',
                context.topicDataMock,
                context.serverMock));

        context.deviceManager.watchers.set('11111111-1111-1111-1111-111111111111', 
            new Watcher('11111111-1111-1111-1111-111111111111',
                'dummyId',
                context.topicDataMock,
                context.serverMock));
    };

    // Preparation:

    test.beforeEach(t => {
        t.context.topicDataMock = new TopicDataMock();
        t.context.serverMock = new ServerMock();
        t.context.deviceManager = new DeviceManager(null, t.context.topicDataMock, t.context.serverMock);
    });

    // Test cases:

    // Participant test cases:

    test('hasParticipant', t => {
        addDummyEntriesToDeviceManager(t.context);

        t.true(t.context.deviceManager.hasParticipant('00000000-0000-0000-0000-000000000000'));
    });

    test('addParticipant', t => {
        t.context.deviceManager.addParticipant(new Participant('00000000-0000-0000-0000-000000000000',
                'dummyId',
                t.context.topicDataMock,
                t.context.serverMock));

        t.true(t.context.deviceManager.participants.has('00000000-0000-0000-0000-000000000000'));
    });

    test('getParticipant', t => {
        let dummy = new Participant('00000000-0000-0000-0000-000000000000',
            'dummyId',
            t.context.topicDataMock,
            t.context.serverMock);
        t.context.deviceManager.participants.set('00000000-0000-0000-0000-000000000000', dummy);

        let returnedParticipant = t.context.deviceManager.getParticipant('00000000-0000-0000-0000-000000000000');

        t.deepEqual(dummy, returnedParticipant);
    });

    test('removeParticipant', t => {
        addDummyEntriesToDeviceManager(t.context);

        t.context.deviceManager.removeParticipant('00000000-0000-0000-0000-000000000000');

        t.true(!t.context.deviceManager.participants.has('00000000-0000-0000-0000-000000000000'));
    });

    test('registerParticipant', t => {
        t.context.deviceManager.registerParticipant(new Participant('00000000-0000-0000-0000-000000000000',
                'dummyId',
                t.context.topicDataMock,
                t.context.serverMock));

        t.true(t.context.deviceManager.participants.has('00000000-0000-0000-0000-000000000000'));
    });

    test('verifyParticipant', t => {
        addDummyEntriesToDeviceManager(t.context);

        t.true(t.context.deviceManager.verifyParticipant('00000000-0000-0000-0000-000000000000'));
    });

    test('basic participants map operations', t => {
        t.notThrows(()=>{
            let dummyParticipant = new Participant('00000000-0000-0000-0000-000000000000',
                'dummyId',
                t.context.topicDataMock,
                t.context.serverMock);

            t.context.deviceManager.addParticipant(dummyParticipant);

            t.true(t.context.deviceManager.hasParticipant('00000000-0000-0000-0000-000000000000'));

            let returnedParticipant = t.context.deviceManager.getParticipant('00000000-0000-0000-0000-000000000000');

            t.deepEqual(dummyParticipant, returnedParticipant);

            t.context.deviceManager.removeParticipant('00000000-0000-0000-0000-000000000000');

            t.true(!t.context.deviceManager.hasParticipant('00000000-0000-0000-0000-000000000000'));
        });
    });

    // Watcher test cases:

    test('hasWatcher', t => {
        addDummyEntriesToDeviceManager(t.context);

        t.true(t.context.deviceManager.hasWatcher('11111111-1111-1111-1111-111111111111'));
    });

    test('addWatcher', t => {
        t.context.deviceManager.addWatcher(new Watcher('11111111-1111-1111-1111-111111111111',
                'dummyId',
                t.context.topicDataMock,
                t.context.serverMock));

        t.true(t.context.deviceManager.watchers.has('11111111-1111-1111-1111-111111111111'));
    });

    test('getWatcher', t => {
        let dummy = new Watcher('11111111-1111-1111-1111-111111111111',
            'dummyId',
            t.context.topicDataMock,
            t.context.serverMock);
        t.context.deviceManager.watchers.set('11111111-1111-1111-1111-111111111111', dummy);

        let returnedWatcher = t.context.deviceManager.getWatcher('11111111-1111-1111-1111-111111111111');

        t.deepEqual(dummy, returnedWatcher);
    });

    test('removeWatcher', t => {
        addDummyEntriesToDeviceManager(t.context);

        t.context.deviceManager.removeWatcher('11111111-1111-1111-1111-111111111111');

        t.true(!t.context.deviceManager.watchers.has('11111111-1111-1111-1111-111111111111'));
    });

    test('registerWatcher', t => {
        t.context.deviceManager.registerWatcher(new Watcher('11111111-1111-1111-1111-111111111111',
                'dummyId',
                t.context.topicDataMock,
                t.context.serverMock));

        t.true(t.context.deviceManager.watchers.has('11111111-1111-1111-1111-111111111111'));
    });

    test('verifyWatcher', t => {
        addDummyEntriesToDeviceManager(t.context);

        t.true(t.context.deviceManager.verifyWatcher('11111111-1111-1111-1111-111111111111'));
    });

    test('basic watchers map operations', t => {
        t.notThrows(()=>{
            let dummyWatcher = new Watcher('11111111-1111-1111-1111-111111111111',
                'dummyId',
                t.context.topicDataMock,
                t.context.serverMock)

            t.context.deviceManager.addWatcher(dummyWatcher);

            t.true(t.context.deviceManager.hasWatcher('11111111-1111-1111-1111-111111111111'));

            let returnedWatcher = t.context.deviceManager.getWatcher('11111111-1111-1111-1111-111111111111');

            t.deepEqual(dummyWatcher, returnedWatcher);

            t.context.deviceManager.removeWatcher('11111111-1111-1111-1111-111111111111');

            t.true(!t.context.deviceManager.hasWatcher('11111111-1111-1111-1111-111111111111'));
        });
    });

    // General test cases:

    test('createDeviceUuid', t => {
        t.notThrows(()=>{
           t.context.deviceManager.createDeviceUuid();
        });
    });

    test('processDeviceRegistration', t => {
        let deviceRegistration = createDeviceSpecificationMock('uniqueId', 0);

        let result = t.context.deviceManager.processDeviceRegistration(deviceRegistration, {});

        t.is(result.error, undefined);
        t.is(result.deviceSpecification.id, 'uniqueId');
    });
})();