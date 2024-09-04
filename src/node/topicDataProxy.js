const namida = require('@tum-far/namida/src/namida');
const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');
const { SUBSCRIPTION_TYPES } = require('@tum-far/ubii-topic-data');

class TopicDataProxy {
  constructor(topicData) {
    this.topicData = topicData;
  }

  pull(topic) {
    return this.topicData.pull(topic);
  }

  /**
   * Subscribe a callback to a given topic.
   * @param {string} topic
   * @param {function} callback
   *
   * @returns {object} Subscription token, save to later unsubscribe
   */
  async subscribeTopic(topic, callback) {
    return this.topicData.subscribeTopic(topic, callback);
  }

  /**
   * Subscribe to the specified regex.
   * @param {*} regexString
   * @param {*} callback
   */
  async subscribeRegex(regex, callback) {
    return this.topicData.subscribeRegex(regex, callback);
  }

  /**
   * Unsubscribe at topicdata and possibly at master node.
   * @param {*} token
   */
  async unsubscribe(token) {
    return this.topicData.unsubscribe(token);
  }

  publishRecord(record) {
    this.topicData.publish(record.topic, record);
  }

  publishRecordImmediately(record) {
    this.publishRecord(record);
  }

  publishRecordList(recordList) {
    for (const record of recordList) {
      this.publishRecord(record);
    }
  }
}

module.exports = TopicDataProxy;
