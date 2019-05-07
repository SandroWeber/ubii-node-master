const uuidv4 = require('uuid/v4');

class TopicMultiplexer {
  constructor({ id = undefined, name = '', dataType = '', topicRegExp = '' }, topicData = undefined) {

    this.id = id ? id : uuidv4();
    this.name = name;
    this.dataType = dataType;
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
      if (entry && entry.type !== this.dataType && entry.data !== undefined) {
        let record = { topic: topic, data: entry.data };
        //TODO: adhere to protobuf TopicDataRecord format?
        //record.type = entry.type;
        //record[entry.type] = entry.data;
        topicDataRecords.push(record);
      }
    });

    return topicDataRecords;
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
      dataType: this.dataType,
      topicRegExp: this.topicRegExp
    };
  }
}

module.exports = {
  'TopicMultiplexer': TopicMultiplexer
}