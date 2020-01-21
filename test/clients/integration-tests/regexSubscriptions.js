import test from 'ava';
import { Client } from '../../../src/index.js';
import { RuntimeTopicData } from '@tum-far/ubii-topic-data';

(function () {
    // Helpers:

    // Preparation:

    test.beforeEach(t => {
        t.context.topicData = new RuntimeTopicData();
        t.context.client = new Client({}, undefined, t.context.topicData);

        t.context.topics = [
            // 0
            {
                topic: '/my/topics/a'
            },
            // 1
            {
                topic: '/my/topics/b'
            },
            // 2
            {
                topic: '/my/topics/c'
            },
            // 3
            {
                topic: '/other/topics/a'
            },
            // 4
            {
                topic: '/other/topics/b'
            }
        ]
    });

    // Test cases:

    test('subscribeRegex', t => {
        let client = t.context.client;
        let topicData = t.context.topicData;
        let topics = t.context.topics;

        let regexString = '/my/topics/*';

        // pre-publish some topics
        topicData.publish(topics[0].topic, true, 'boolean');
        topicData.publish(topics[1].topic, true, 'boolean');
        topicData.publish(topics[3].topic, true, 'boolean');

        // subscribe regex
        client.subscribeRegex(regexString);

        // check subscriptions to existing topics matching regex
        t.true(client.topicSubscriptionTokens.has(topics[0].topic));
        t.true(client.topicSubscriptionTokens.has(topics[1].topic));
        t.false(client.topicSubscriptionTokens.has(topics[3].topic));

        // publish other topics
        topicData.publish(topics[2].topic, true, 'boolean');
        topicData.publish(topics[4].topic, true, 'boolean');

        // check new subscriptions
        t.true(client.topicSubscriptionTokens.has(topics[2].topic));
        t.false(client.topicSubscriptionTokens.has(topics[4].topic));
    });

    test('subscribeRegex - double subscribe', t => {
        let client = t.context.client;

        let regexString = '/my/topics/*';

        let success = client.subscribeRegex(regexString);
        t.true(success);

        try {
            success = client.subscribeRegex(regexString);
        } catch (error) {
            console.info(error);
        }

        //t.false(success);
    });
})();