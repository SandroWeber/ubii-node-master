import test from 'ava';
import { RuntimeTopicData } from '@tum-far/ubii-topic-data';

import { Client } from '../../../src/index.js';
import { ServerMock } from '../../mocks/serverMock';

(function () {
  // Helpers:

  // Preparation:

  test.beforeEach((t) => {
    t.context.topicData = new RuntimeTopicData();
    t.context.server = new ServerMock();
    t.context.client = new Client({}, t.context.server, t.context.topicData);

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
    ];
  });

  // Test cases:

  test('subscribeRegex', (t) => {
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
    t.true(client.regexSubscriptions.has(regexString));

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

  test('subscribeRegex - double subscribe', (t) => {
    let client = t.context.client;

    let regexString = '/my/topics/*';

    let success = client.subscribeRegex(regexString);
    t.true(success);

    success = client.subscribeRegex(regexString);
    t.false(success);
  });

  test('unsubscribeRegex', (t) => {
    let client = t.context.client;
    let topicData = t.context.topicData;
    let topics = t.context.topics;
    let server = t.context.server;

    let regexString = '/my/topics/*';

    // subscribe
    client.subscribeRegex(regexString);
    //publish
    topicData.publish(topics[0].topic, true, 'boolean');
    topicData.publish(topics[1].topic, true, 'boolean');
    // check subscriptions to existing topics matching regex
    t.true(client.topicSubscriptionTokens.has(topics[0].topic));
    t.true(client.topicSubscriptionTokens.has(topics[1].topic));

    // unsubscribe
    let callCountSendBeforeUnsubscribe = server.send.callCount;
    client.unsubscribeRegex(regexString);
    // check that subscriptions are gone
    t.false(client.topicSubscriptionTokens.has(topics[0].topic));
    t.false(client.topicSubscriptionTokens.has(topics[1].topic));
    //publish again
    topicData.publish(topics[0].topic, true, 'boolean');
    topicData.publish(topics[1].topic, true, 'boolean');
    // should not send out any more messages
    t.is(server.send.callCount, callCountSendBeforeUnsubscribe);
    // check subscriptions again, should not resubscribe after publishing
    t.false(client.topicSubscriptionTokens.has(topics[0].topic));
    t.false(client.topicSubscriptionTokens.has(topics[1].topic));

    // publish new topic matching regex, should not subscribe to it
    topicData.publish(topics[2].topic, true, 'boolean');
    t.false(client.topicSubscriptionTokens.has(topics[2].topic));
  });

  test('regex and regular topic subscriptions overlapping', (t) => {
    let client = t.context.client;
    let topicData = t.context.topicData;
    let topics = t.context.topics;
    let server = t.context.server;

    let regexString = '/my/topics/*';

    // subscribe
    client.subscribeRegex(regexString);
    //publish
    topicData.publish(topics[0].topic, true, 'boolean');
    topicData.publish(topics[1].topic, true, 'boolean');
    // check subscriptions to existing topics matching regex
    t.true(client.topicSubscriptionTokens.has(topics[0].topic));
    t.true(client.topicSubscriptionTokens.has(topics[1].topic));

    // unsubscribe
    let callCountSendBeforeUnsubscribe = server.send.callCount;
    client.unsubscribeRegex(regexString);
    // check that subscriptions are gone
    t.false(client.topicSubscriptionTokens.has(topics[0].topic));
    t.false(client.topicSubscriptionTokens.has(topics[1].topic));
    //publish again
    topicData.publish(topics[0].topic, true, 'boolean');
    topicData.publish(topics[1].topic, true, 'boolean');
    // should not send out any more messages
    t.is(server.send.callCount, callCountSendBeforeUnsubscribe);
    // check subscriptions again, should not resubscribe after publishing
    t.false(client.topicSubscriptionTokens.has(topics[0].topic));
    t.false(client.topicSubscriptionTokens.has(topics[1].topic));

    // publish new topic matching regex, should not subscribe to it
    topicData.publish(topics[2].topic, true, 'boolean');
    t.false(client.topicSubscriptionTokens.has(topics[2].topic));
  });
})();
