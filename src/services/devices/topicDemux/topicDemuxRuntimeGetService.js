const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../../service.js');

class TopicDemuxRuntimeGetService extends Service {
  constructor(deviceManager) {
    super(
      DEFAULT_TOPICS.SERVICES.TOPIC_DEMUX_RUNTIME_GET,
      MSG_TYPES.TOPIC_DEMUX,
      MSG_TYPES.TOPIC_DEMUX + ', ' + MSG_TYPES.ERROR
    );

    this.deviceManager = deviceManager;
  }

  reply(specs) {
    try {
      let demuxSpecs = this.deviceManager.getTopicDemux(specs.id);

      return {
        topicDemux: demuxSpecs
      };
    } catch (error) {
      return {
        error: {
          title: 'TopicDemuxRuntimeGetService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString()
        }
      };
    }
  }
}

module.exports = {
  TopicDemuxRuntimeGetService: TopicDemuxRuntimeGetService
};
