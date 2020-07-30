const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../../service.js');

class TopicMuxRuntimeGetListService extends Service {
  constructor(deviceManager) {
    super(DEFAULT_TOPICS.SERVICES.TOPIC_MUX_RUNTIME_GET_LIST, undefined, MSG_TYPES.TOPIC_MUX_LIST);

    this.deviceManager = deviceManager;
  }

  reply() {
    try {
      let muxSpecsList = this.deviceManager.getTopicMuxList().map((mux) => {
        return mux.toProtobuf();
      });

      return {
        topicMuxList: muxSpecsList
      };
    } catch (error) {
      return {
        error: {
          title: 'TopicMuxRuntimeGetListService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString()
        }
      };
    }
  }
}

module.exports = {
  TopicMuxRuntimeGetListService: TopicMuxRuntimeGetListService
};
