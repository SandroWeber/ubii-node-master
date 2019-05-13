import test from 'ava';
import {
    Participant
} from '../../src/index.js';
import {
    ServerMock,
    TopicDataMock
} from '../mocks/serverMockDevices';

(function () {

    test.beforeEach(t => {
        t.context.topicDataMock = new TopicDataMock();
        t.context.serverMock = new ServerMock();
    });
    
    test('create Participant', t => {
        t.notThrows(() => {
            let participant = new Participant({}, undefined, t.context.topicDataMock);
        });
    });
})();