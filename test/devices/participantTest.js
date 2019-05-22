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
    
    /* integration tests */
    test('emit "newTopic" event for input components', t => {
        let topicData = new RuntimeTopicData();
        let listener = sinon.fake();
        topicData.events.on('newTopic', listener);
        let components = [
            {
                topic: 'my-topic-0',
                ioType: proto.ubii.devices.Component.IOType.INPUT
            },
            {
                topic: 'my-topic-1',
                ioType: proto.ubii.devices.Component.IOType.INPUT
            }
        ];
        let participant = new Participant({
            components: components
        }, undefined, topicData);

        t.is(listener.callCount, 2);
        listener.args.forEach((argument, index) => {
            t.is(argument[0], 'my-topic-' + index);
        });
    });
})();