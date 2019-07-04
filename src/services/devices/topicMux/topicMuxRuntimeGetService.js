const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../../service.js');
const topicMuxDatabase = require('../../../storage/topicMuxDatabase');

class TopicMuxRuntimeGetService extends Service {
  constructor(deviceManager) {
    super(DEFAULT_TOPICS.SERVICES.TOPIC_MUX_RUNTIME_START);

    this.deviceManager = deviceManager;
  }

  reply(specs) {
    try {
      let muxSpecs = this.deviceManager.getTopicMux(specs.id);

      return {
        topicMux: muxSpecs
      };
    }
    catch (error) {
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
  'TopicMuxRuntimeGetService': TopicMuxRuntimeGetService,
};