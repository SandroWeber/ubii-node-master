const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../../service.js');

class TopicMuxRuntimeGetService extends Service {
  constructor(deviceManager) {
    super(
      DEFAULT_TOPICS.SERVICES.TOPIC_MUX_RUNTIME_GET,
      MSG_TYPES.TOPIC_MUX,
      MSG_TYPES.TOPIC_MUX + ', ' + MSG_TYPES.ERROR
    );

    this.deviceManager = deviceManager;
  }

  reply(specs) {
    try {
      let muxSpecs = this.deviceManager.getTopicMux(specs.id);

      return {
        topicMux: muxSpecs
      };
    } catch (error) {
      return {
        error: {
          title: 'TopicMuxRuntimeGetService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString()
        }
      };
    }
  }
}

module.exports = {
  TopicMuxRuntimeGetService: TopicMuxRuntimeGetService
};
