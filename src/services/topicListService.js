const { Service } = require('./service.js');

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class TopicListService extends Service {
  constructor(topicData, serviceManager) {
    super(DEFAULT_TOPICS.SERVICES.TOPIC_LIST);

    this.topicData = topicData;
    this.serviceManager = serviceManager;
  }

  reply() {
    let serviceTopics = this.serviceManager.getTopicList();
    let dataTopics = this.topicData.getAllTopicsWithData().map((entry) => entry.topic);

    return {
      stringList: {
        list: serviceTopics.concat(dataTopics)
      }
    };
  }
}

module.exports = {
  TopicListService: TopicListService
};
