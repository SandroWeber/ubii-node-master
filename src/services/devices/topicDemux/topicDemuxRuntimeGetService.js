const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../../service.js');

class TopicDemuxRuntimeGetService extends Service {
  constructor(deviceManager) {
    super(DEFAULT_TOPICS.SERVICES.TOPIC_DEMUX_RUNTIME_GET);

    this.deviceManager = deviceManager;
  }

  reply(specs) {
    try {
      let demuxSpecs = this.deviceManager.getTopicDemux(specs.id);

      return {
        topicDemux: demuxSpecs
      };
    }
    catch (error) {
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
  'TopicDemuxRuntimeGetService': TopicDemuxRuntimeGetService,
};