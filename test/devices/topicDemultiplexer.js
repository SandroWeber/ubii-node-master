import test from 'ava';
import sinon from 'sinon';

const {
  RuntimeTopicData
} = require('@tum-far/ubii-topic-data');

const {
  TopicDemultiplexer
} = require('../../src/index');


(function () {

  // Preparation:

  test.beforeEach(t => {
    t.context.topicData = new RuntimeTopicData();
    t.context.topicData.publish = sinon.fake();

    t.context.testData1 = {
      dataType: 'vector2',
      outputTopicFormat: '%s/some/%d/topic/%c/data/%.1f',
      topicDataList: [
        {
          data: {x: 0, y: 0},
          outputTopicParams: ['client1', 1, 'a', 0.1],
          expectedOutputTopic: 'client1/some/1/topic/a/data/0.1'
        },
        {
          data: {x: 1, y: 1},
          outputTopicParams: ['client2', 2, 'b', 2.3],
          expectedOutputTopic: 'client2/some/2/topic/b/data/2.3'
        },
        {
          data: {x: 2, y: 2},
          outputTopicParams: ['client3', 3, 'c', 4.5],
          expectedOutputTopic: 'client3/some/3/topic/c/data/4.5'
        }
      ]
    }

    // malformed outputTopicParams
    t.context.testData2 = {
      dataType: 'vector2',
      outputTopicFormat: '%s/some/%d/topic/%c/data/%.1f',
      topicDataList: [
        {
          data: {x: 0, y: 0},
          // outputTopicParams[3] is malformed
          outputTopicParams: ['client1', 1, 'a', 'string'],
          expectedOutputTopic: 'client1/some/999/topic/a/data/0.1'
        }
      ]
    }
  });

  // Test cases:

  test('constructor', t => {
    let demux;
    t.notThrows(() => {
      demux = new TopicDemultiplexer(
        { name: 'test-mux', dataType: t.context.testData1.dataType, outputTopicFormat: t.context.testData1.outputTopicFormat },
        t.context.topicData);
    });
    t.true(demux.id.length > 0);
  });

  test('push - fitting number of output topic parameters', t => {
    let data = t.context.testData1;
    let demux = new TopicDemultiplexer(
      { name: 'test-mux', dataType: data.dataType, outputTopicFormat: data.outputTopicFormat },
      t.context.topicData);

    demux.push(data.topicDataList);
    t.is(t.context.topicData.publish.callCount, data.topicDataList.length);
    data.topicDataList.forEach((entry, index) => {
      let topic = t.context.topicData.publish.args[index][0];
      t.is(topic, entry.expectedOutputTopic);
    });
  });

  test('push - malformed parameters, string instead of float', t => {
    let data = t.context.testData2;
    let demux = new TopicDemultiplexer(
      { name: 'test-mux', dataType: data.dataType, outputTopicFormat: data.outputTopicFormat },
      t.context.topicData);

    t.throws(() => {
      demux.push(data.topicDataList)
    });
  });
})();