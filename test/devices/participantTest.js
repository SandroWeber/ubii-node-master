import test from 'ava';
import sinon from 'sinon';
import {
    Participant
} from '../../src/index.js';
import {
    ServerMock,
    TopicDataMock
} from '../mocks/serverMockDevices';

import {RuntimeTopicData} from '@tum-far/ubii-topic-data';
import {proto} from '@tum-far/ubii-msg-formats';

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