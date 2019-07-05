import test from 'ava';

const {
  RuntimeTopicData,
  TOPIC_EVENTS
} = require('@tum-far/ubii-topic-data');

const {
  TopicMultiplexer
} = require('../../src/index');


/* integration tests */
(function () {

  // Preparation:

  test.beforeEach(t => {
    t.context.topicData = new RuntimeTopicData();
    t.context.topicsCategoryA = [
      '/1234567890/category_A/something',
      '/2345678901/category_A/someting_else/etc',
      '/3456789012/etc/category_A/someting_more'
    ];
    t.context.topicsCategoryB = [
      '/1234567890/category_B/something',
      '/2345678901/category_B/someting_else/etc',
      '/3456789012/etc/category_B/someting_more'
    ];

    t.context.publishAllTopics = () => {
      t.context.topicsCategoryA.forEach((topic, index) => {
        t.context.topicData.publish(topic, { x: index, y: index }, 'vector2');
      });
      t.context.topicsCategoryB.forEach((topic, index) => {
        t.context.topicData.publish(topic, { x: index, y: index, z: index }, 'vector3');
      });
    }
  });

  // Test cases:

  test('constructor', t => {
    let topicSelector = 'topic_type_a';
    let mux;
    t.notThrows(() => {
      mux = new TopicMultiplexer(
        { name: 'test-mux', dataType: 'vector2', topicSelector: topicSelector },
        t.context.topicData);
    });
    t.true(mux.id.length > 0);
  });

  test('updateTopicList', t => {
    t.context.publishAllTopics();

    let topicSelector = 'category_A';
    let mux = new TopicMultiplexer(
      { name: 'test-mux', dataType: 'vector2', topicSelector: topicSelector },
      t.context.topicData);
    mux.updateTopicList();

    t.is(mux.topicList.length, t.context.topicsCategoryA.length);
    mux.topicList.forEach((topic) => {
      t.true(t.context.topicsCategoryA.includes(topic));
    });
  });

  test('addTopic', t => {
    let topicSelector = 'category_A';
    let mux = new TopicMultiplexer(
      { name: 'test-mux', dataType: 'vector2', topicSelector: topicSelector },
      t.context.topicData);

    let invalidTopic = '/my/invalid/topic/category';
    mux.addTopic(invalidTopic);
    t.is(mux.topicList.length, 0);

    let validTopic = '/my/valid/topic/category_A';
    mux.addTopic(validTopic);
    t.is(mux.topicList.length, 1);
    t.true(mux.topicList.indexOf(validTopic) !== -1);
  });

  test('get - simple selector', t => {
    t.context.publishAllTopics();

    let topicSelector = 'category_A';
    let mux = new TopicMultiplexer(
      { name: 'test-mux', dataType: 'vector2', topicSelector: topicSelector },
      t.context.topicData);
    let topicDataList = mux.get();

    t.is(topicDataList.length, t.context.topicsCategoryA.length);
    topicDataList.forEach((topicDataRecord) => {
      t.true(t.context.topicsCategoryA.includes(topicDataRecord.topic));

      let index = t.context.topicsCategoryA.indexOf(topicDataRecord.topic);
      t.deepEqual(topicDataRecord.data, { x: index, y: index });
    });
  });

  test('get - complex selector', t => {
    t.context.publishAllTopics();

    let topicSelector = '[0-9]+\/category_A\/';
    let mux = new TopicMultiplexer(
      { name: 'test-mux', dataType: 'vector2', topicSelector: topicSelector },
      t.context.topicData);
    let topicDataList = mux.get();

    let correctTopics = [];
    let regexp = new RegExp(topicSelector);
    t.context.topicsCategoryA.forEach((topic) => {
      if (regexp.test(topic)) {
        correctTopics.push(topic);
      }
    });
    t.context.topicsCategoryB.forEach((topic) => {
      if (regexp.test(topic)) {
        correctTopics.push(topic);
      }
    });

    t.is(topicDataList.length, correctTopics.length);
    topicDataList.forEach((topicDataRecord) => {
      t.true(t.context.topicsCategoryA.includes(topicDataRecord.topic));

      let index = t.context.topicsCategoryA.indexOf(topicDataRecord.topic);
      t.deepEqual(topicDataRecord.data, { x: index, y: index });
      t.is(topicDataRecord[topicDataRecord.type], topicDataRecord.data);
    });
  });

  test('get - identity extraction via pattern match', t => {
    t.context.publishAllTopics();

    let topicSelector = '[0-9]+\/category_A\/';
    let identityMatchPattern = '\/[0-9]+\/';
    let mux = new TopicMultiplexer(
      { name: 'test-mux', dataType: 'vector2', topicSelector: topicSelector, identityMatchPattern: identityMatchPattern },
      t.context.topicData);
    let topicDataList = mux.get();

    let confirmedIdentities = t.context.topicsCategoryA.map((topic) => {
      return topic.match(new RegExp(identityMatchPattern))[0];
    });
    topicDataList.forEach((record, index) => {
      t.is(record.identity, confirmedIdentities[index]);
    });
  });

  test('add matching topics on event "new topic"', t => {
    let topicSelector = '[0-9]+\/category_A\/';
    let identityMatchPattern = '\/[0-9]+\/';
    let mux = new TopicMultiplexer(
      { name: 'test-mux', dataType: 'vector2', topicSelector: topicSelector, identityMatchPattern: identityMatchPattern },
      t.context.topicData);

    let invalidTopic = '/category_A/invalid/topic';
    t.context.topicData.events.emit(TOPIC_EVENTS.NEW_TOPIC, invalidTopic);
    t.is(mux.topicList.length, 0);

    let validTopic = '/12345/category_A/invalid/topic';
    t.context.topicData.events.emit(TOPIC_EVENTS.NEW_TOPIC, validTopic);
    t.is(mux.topicList.length, 1);
    t.true(mux.topicList.indexOf(validTopic) !== -1);
  });
})();