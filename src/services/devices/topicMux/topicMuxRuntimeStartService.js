const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../../service.js');
const topicMuxDatabase = require('../../../storage/topicMuxDatabase');

class TopicMuxRuntimeStartService extends Service {
  constructor(deviceManager) {
    super(
      DEFAULT_TOPICS.SERVICES.TOPIC_MUX_RUNTIME_START,
      MSG_TYPES.TOPIC_MUX,
      MSG.TOPIC_MUX + ', ' + MSG_TYPES.ERROR
    );

    this.deviceManager = deviceManager;
  }

  reply(specs) {
    try {
      let muxSpecs = topicMuxDatabase.getSpecification(specs.id);
      if (muxSpecs === undefined) {
        muxSpecs = specs;
      }

      this.deviceManager.createTopicMuxerBySpecs(muxSpecs);

      return {
        topicMux: muxSpecs
      };
    } catch (error) {
      return {
        error: {
          title: 'TopicMuxRuntimeStartService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString()
        }
      };
    }
  }
}

module.exports = {
  TopicMuxRuntimeStartService: TopicMuxRuntimeStartService
};
