import test from 'ava';
import {
    Watcher
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

    test('create Watcher', t => {
        t.notThrows(() => {
            let watcher = new Watcher({}, undefined, t.context.topicDataMock);
        });
    });
})();