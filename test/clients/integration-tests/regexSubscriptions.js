import test from 'ava';
import sinon from 'sinon';

import { RuntimeTopicData } from '@tum-far/ubii-topic-data';

import { Client } from '../../../src/index.js';
import { ServerMock } from '../../mocks/serverMock';

//TODO: needs rework
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

    client.subscriptionCallback = sinon.fake();

    let regexString = '/my/topics/*'; // matches topics 0-2

    // pre-publish some topics
    topicData.publish(topics[0].topic, true, 'boolean');
    topicData.publish(topics[1].topic, true, 'boolean');
    topicData.publish(topics[3].topic, true, 'boolean');

    // subscribe regex
    client.subscribeRegex(regexString);
    t.true(client.regexSubscriptions.has(regexString));

    // check subscriptions to existing topics matching regex
    setTimeout(() => {
      t.is(client.subscriptionCallback.callCount, 2);
    }, 0);

    // publish other topics
    topicData.publish(topics[2].topic, true, 'boolean');
    topicData.publish(topics[4].topic, true, 'boolean');

    // check new subscriptions
    t.is(client.subscriptionCallback.callCount, 3);
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
    t.true(client.topicSubscriptions.has(topics[0].topic));
    t.true(client.topicSubscriptions.has(topics[1].topic));

    // unsubscribe
    let callCountSendBeforeUnsubscribe = server.send.callCount;
    client.unsubscribeRegex(regexString);
    // check that subscriptions are gone
    t.false(client.topicSubscriptions.has(topics[0].topic));
    t.false(client.topicSubscriptions.has(topics[1].topic));
    //publish again
    topicData.publish(topics[0].topic, true, 'boolean');
    topicData.publish(topics[1].topic, true, 'boolean');
    // should not send out any more messages
    t.is(server.send.callCount, callCountSendBeforeUnsubscribe);
    // check subscriptions again, should not resubscribe after publishing
    t.false(client.topicSubscriptions.has(topics[0].topic));
    t.false(client.topicSubscriptions.has(topics[1].topic));

    // publish new topic matching regex, should not subscribe to it
    topicData.publish(topics[2].topic, true, 'boolean');
    t.false(client.topicSubscriptions.has(topics[2].topic));
  });

  test('regex and regular topic subscriptions overlapping', (t) => {
    let client = t.context.client;
    let topicData = t.context.topicData;
    let topics = t.context.topics;
    let server = t.context.server;

    let topicA = '/my';
    let topicB = '/my/topics/b';
    let topicC = '/my/topics/c';
    let regexX = '/*';
    let regexY = '/my/*';
    let regexZ = '/my/topics/*';

    // publish on all topics
    topicData.publish(topicA, true, 'boolean');
    topicData.publish(topicB, true, 'boolean');
    topicData.publish(topicC, true, 'boolean');

    // subscribe to all topics and regExes
    client.subscribeTopic(topicA);
    client.subscribeTopic(topicB);
    client.subscribeTopic(topicC);
    client.subscribeRegex(regexX);
    client.subscribeRegex(regexY);
    client.subscribeRegex(regexZ);

    // check each topic is subscribed explicitly and by respective regular expressions
    t.deepEqual(client.topicSubscriptions.get(topicA), {
      explicit: true,
      regExes: [regexX, regexY]
    });
    [topicB, topicC].forEach((topic) => {
      t.deepEqual(client.topicSubscriptions.get(topic), {
        explicit: true,
        regExes: [regexX, regexY, regexZ]
      });
    });
    // check each topic has a subscription token
    [topicA, topicB, topicC].forEach((topic) => {
      t.true(client.topicSubscriptions.has(topic));
    });

    // unsubscribe from topic A
    client.unsubscribeTopic(topicA);
    // check that general tokens are still valid but no explicit subscription to topic A
    [topicA, topicB, topicC].forEach((topic) => {
      t.true(client.topicSubscriptions.has(topic));
    });
    t.deepEqual(client.topicSubscriptions.get(topicA), {
      explicit: false,
      regExes: [regexX, regexY]
    });

    // unsubscribe from regex X
    client.unsubscribeRegex(regexX);
    // check that general tokens are still valid but no subs for regex X
    [topicA, topicB, topicC].forEach((topic) => {
      t.true(client.topicSubscriptions.has(topic));
    });
    [topicA, topicB, topicC].forEach((topic) => {
      t.false(client.topicSubscriptions.get(topic).regExes.includes(regexX));
    });

    // unsub from regex Y
    client.unsubscribeRegex(regexY);
    // all subs to topic A should be gone, including token from topic data
    t.false(client.topicSubscriptions.has(topicA));
    t.false(client.topicSubscriptions.has(topicA));

    // unsub from regex Z
    client.unsubscribeRegex(regexZ);
    // topic C should still have explicit subscription
    t.true(client.topicSubscriptions.get(topicC).explicit);
    t.true(client.topicSubscriptions.has(topicC));
  });
})();
