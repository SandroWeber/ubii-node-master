const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('./service.js');

class TopicListService extends Service {
  constructor(serviceManager, topicData) {
    super(DEFAULT_TOPICS.SERVICES.TOPIC_LIST, undefined, MSG_TYPES.DATASTRUCTURE_STRING_LIST);

    this.serviceManager = serviceManager;
    this.topicData = topicData;
  }

  reply() {
    let serviceTopics = this.serviceManager.getTopicList();
    let dataTopics = this.topicData.getAllTopicsWithData().map((entry) => entry.topic);

    return {
      stringList: {
        elements: serviceTopics.concat(dataTopics)
      }
    };
  }
}

module.exports = {
  TopicListService: TopicListService
};
