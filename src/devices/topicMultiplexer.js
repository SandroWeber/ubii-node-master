const uuidv4 = require('uuid/v4');

class TopicMultiplexer {
  constructor({ id = undefined, name = '', messageFormat = '', topicRegExp = '' }, topicData = undefined) {

    this.id = id ? id : uuidv4();
    this.name = name;
    this.messageFormat = messageFormat;
    this.topicRegExp = topicRegExp;

    this.topicData = topicData;
    this.topicList = [];
    this.topicSelectorRegExp = new RegExp(this.topicRegExp);
  }

  get() {
    this.updateTopicList();

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
      if (this.topicSelectorRegExp.test(entry.topic)) {
        selectedTopics.push(entry.topic);
      }
      return selectedTopics;
    }, []);
  }

  toProtobuf() {
    return {
      id: this.id,
      name: this.name,
      messageFormat: this.messageFormat,
      topicRegExp: this.topicRegExp
    };
  }
}

module.exports = {
  'TopicMultiplexer': TopicMultiplexer
}