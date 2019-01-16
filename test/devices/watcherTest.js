import test from 'ava';
import {
    Watcher
} from '../src/devices/watcher.js';
import {
    ServerMock,
    TopicDataMock
} from '../mocks/mocks.js';

(function () {

    test.beforeEach(t => {
        t.context.topicDataMock = new TopicDataMock();
        t.context.serverMock = new ServerMock();
    });

    test('create Watcher', t => {
        t.notThrows(() => {
            let watcher = new Watcher();
        });
    });
})();