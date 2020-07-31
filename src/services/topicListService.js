const { Service } = require('./service.js');

const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class TopicListService extends Service {
  constructor(topicData, serviceManager) {
    super(DEFAULT_TOPICS.SERVICES.TOPIC_LIST, undefined, MSG_TYPES.DATASTRUCTURE_STRING_LIST);

    this.topicData = topicData;
    this.serviceManager = serviceManager;
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
