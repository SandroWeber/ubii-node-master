import test from 'ava';

const {
  RuntimeTopicData
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
        { name: 'test-mux', messageFormat: 'ubii.dataStructure.Vector2', topicRegExp: topicSelector },
        t.context.topicData);
    });
    t.true(mux.id.length > 0);
  });

  test('updateTopicList', t => {
    let topicdata = t.context.topicData;
    t.context.publishAllTopics();


    let topicSelector = 'category_A';
    let mux = new TopicMultiplexer(
      { name: 'test-mux', messageFormat: 'ubii.dataStructure.Vector2', topicRegExp: topicSelector },
      t.context.topicData);
    mux.updateTopicList();

    t.is(mux.topicList.length, t.context.topicsCategoryA.length);
    mux.topicList.forEach((topic) => {
      t.true(t.context.topicsCategoryA.includes(topic));
    });
  });

  test('get - simple selector', t => {
    let topicdata = t.context.topicData;
    t.context.publishAllTopics();

    let topicSelector = 'category_A';
    let mux = new TopicMultiplexer(
      { name: 'test-mux', messageFormat: 'ubii.dataStructure.Vector2', topicRegExp: topicSelector },
      t.context.topicData);
    let topicData = mux.get();

    t.is(topicData.topicDataRecordList.length, t.context.topicsCategoryA.length);
    topicData.topicDataRecordList.forEach((topicDataRecord) => {
      t.true(t.context.topicsCategoryA.includes(topicDataRecord.topic));

      let index = t.context.topicsCategoryA.indexOf(topicDataRecord.topic);
      t.deepEqual(topicDataRecord[topicDataRecord.type], {x: index, y: index});
    });
  });

  test('get - complex selector', t => {
    let topicdata = t.context.topicData;
    t.context.publishAllTopics();

    let topicSelector = '[0-9]+\/category_A\/';
    let mux = new TopicMultiplexer(
      { name: 'test-mux', messageFormat: 'ubii.dataStructure.Vector2', topicRegExp: topicSelector },
      t.context.topicData);
    let topicData = mux.get();

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

    t.is(topicData.topicDataRecordList.length, correctTopics.length);
    topicData.topicDataRecordList.forEach((topicDataRecord) => {
      t.true(t.context.topicsCategoryA.includes(topicDataRecord.topic));

      let index = t.context.topicsCategoryA.indexOf(topicDataRecord.topic);
      t.deepEqual(topicDataRecord[topicDataRecord.type], {x: index, y: index});
    });
  });
})();