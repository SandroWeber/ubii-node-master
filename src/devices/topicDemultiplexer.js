const uuidv4 = require('uuid/v4');

class TopicDemultiplexer {
  constructor({ id = undefined, name = '', dataType = '', outputTopicFormat = '' }, topicData = undefined) {

    this.id = id ? id : uuidv4();
    this.name = name;
    this.dataType = dataType;

    this.topicData = topicData;
  }

  /**
   * 
   */
  push(topicDataList) {
  }

  toProtobuf() {
    return {};
  }
}

module.exports = {
  'TopicDemultiplexer': TopicDemultiplexer
}