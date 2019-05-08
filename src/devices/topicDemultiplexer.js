const uuidv4 = require('uuid/v4');

class TopicDemultiplexer {
  constructor({ id = undefined, name = '', dataType = '', outputTopicFormat = '' }, topicData = undefined) {

    this.id = id ? id : uuidv4();
    this.name = name;
    this.dataType = dataType;
    this.outputTopicFormat = outputTopicFormat;

    this.topicData = topicData;
  }

  /**
   * 
   */
  push(topicDataList) {
    topicDataList.forEach((entry) => {
      let outputTopic = outputTopicFormat.format(...entry.formatParams);
      this.topicData.publish(outputTopic, entry.data, this.dataType);
    });
  }

  toProtobuf() {
    return {};
  }
}

module.exports = {
  'TopicDemultiplexer': TopicDemultiplexer
}