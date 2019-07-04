const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../../service.js');
const topicMuxDatabase = require('../../../storage/topicMuxDatabase');

class TopicMuxRuntimeGetListService extends Service {
  constructor(deviceManager) {
    super(DEFAULT_TOPICS.SERVICES.TOPIC_MUX_RUNTIME_START);

    this.deviceManager = deviceManager;
  }

  reply(specs) {
    try {
      let muxSpecsList = this.deviceManager.getTopicMuxList().map((mux) => { return mux.toProtobuf(); });

      return {
        topicMuxList: muxSpecsList
      };
    }
    catch (error) {
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
  'TopicMuxRuntimeGetListService': TopicMuxRuntimeGetListService,
};