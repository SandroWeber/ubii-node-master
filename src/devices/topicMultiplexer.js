const uuidv4 = require('uuid/v4');

class TopicMultiplexer {
  constructor({ id = undefined, name = '', messageFormat = '', topicSelector = '' }, topicData = undefined) {

    this.id = id ? id : uuidv4();
    this.name = name;
    this.messageFormat = messageFormat;

    this.topicData = topicData;
    this.topicList = [];
    this.topicSelector = topicSelector;
  }

  get() {
    let topicDataRecords = [];
    this.topicList.forEach((topic) => {
      let entry = this.topicData.pull(topic);
      if (entry && entry.type !== undefined && entry.data !== undefined) {
        let record = { topic: topic };
        record[entry.type] = entry.data;
        topicDataRecords.push(record);
      }
    });

    return { topicDataRecordList: topicDataRecords };
  }

  updateTopicList() {
    this.topicList = this.topicData.getAllTopicsWithData().reduce((selectedTopics, entry) => {
      if (this.topicSelector.test(entry.topic)) {
        selectedTopics.push(entry.topic);
      }
      return selectedTopics;
    }, []);
    console.info(this.topicList);
  }

  toProtobuf() {
    return {};
  }
}

module.exports = {
  'TopicMultiplexer': TopicMultiplexer
}