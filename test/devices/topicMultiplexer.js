import test from 'ava';

const {
  RuntimeTopicData
} = require('@tum-far/ubii-topic-data');

const {
  TopicMultiplexer,
  RuntineTopicData
} = require('../../src/index');

/* integration tests */
(function () {

    // Preparation:

    test.beforeEach(t => {
      t.context.topicData = new RuntimeTopicData();
    });

    // Test cases:

    test('constructor', t => {
      let topicSelector = 'topic_type_a';
      let mux;
      t.notThrows(()=>{
        mux = new TopicMultiplexer(
          {name: 'test-mux', messageFormat: 'ubii.dataStructure.Vector2', topicRegExp: topicSelector}, 
          t.context.topicData);
      });
      t.true(mux.id.length > 0);
    });
})();