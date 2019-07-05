const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../../service.js');

class TopicDemuxRuntimeStopService extends Service {
  constructor(deviceManager) {
    super(DEFAULT_TOPICS.SERVICES.TOPIC_DEMUX_RUNTIME_STOP);

    this.deviceManager = deviceManager;
  }

  reply(specs) {
    try {
      this.deviceManager.deleteTopicDemux(specs.id);

      return {
        success: {
          title: 'TopicDemuxRuntimeStopService Success',
          message: 'Stop topic demux (ID ' + specs.id + ') SUCCESS'
        }
      };
    }
    catch (error) {
      return {
        error: {
          title: 'TopicDemuxRuntimeStopService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString()
        }
      };
    }
  }
}

module.exports = {
  'TopicDemuxRuntimeStopService': TopicDemuxRuntimeStopService,
};