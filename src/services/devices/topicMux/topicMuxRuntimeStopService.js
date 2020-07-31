const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../../service.js');
const topicMuxDatabase = require('../../../storage/topicMuxDatabase');

class TopicMuxRuntimeStopService extends Service {
  constructor(deviceManager) {
    super(
      DEFAULT_TOPICS.SERVICES.TOPIC_MUX_RUNTIME_STOP,
      MSG_TYPES.TOPIC_MUX,
      MSG_TYPES.TOPIC_MUX + ', ' + MSG_TYPES.ERROR
    );

    this.deviceManager = deviceManager;
  }

  reply(specs) {
    try {
      this.deviceManager.deleteTopicMux(specs.id);

      return {
        success: {
          title: 'TopicMuxRuntimeStopService Success',
          message: 'Stop topic mux (ID ' + specs.id + ') SUCCESS'
        }
      };
    } catch (error) {
      return {
        error: {
          title: 'TopicMuxRuntimeStopService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString()
        }
      };
    }
  }
}

module.exports = {
  TopicMuxRuntimeStopService: TopicMuxRuntimeStopService
};
