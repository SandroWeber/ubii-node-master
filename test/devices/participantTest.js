import test from 'ava';
import {
    Participant
} from '../src/devices/participant.js';
import {
    ServerMock,
    TopicDataMock
} from '../mocks/mocks.js';

(function () {

    test.beforeEach(t => {
        t.context.topicDataMock = new TopicDataMock();
        t.context.serverMock = new ServerMock();
    });
    
    test('create Participant', t => {
        t.notThrows(() => {
            let participant = new Participant();
        });
    });
})();