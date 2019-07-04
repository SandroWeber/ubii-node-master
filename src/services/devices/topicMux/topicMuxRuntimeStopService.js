const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../../service.js');
const topicMuxDatabase = require('../../../storage/topicMuxDatabase');

class TopicMuxRuntimeStopService extends Service {
  constructor(deviceManager) {
    super(DEFAULT_TOPICS.SERVICES.TOPIC_MUX_RUNTIME_START);

    this.deviceManager = deviceManager;
  }

  reply(specs) {
    try {
      this.deviceManager.deleteTopicMux(specs.id);

      return {
        topicMux: muxSpecs
      };
    }
    catch (error) {
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
  'TopicMuxRuntimeStopService': TopicMuxRuntimeStopService,
};