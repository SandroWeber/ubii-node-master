const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../../service.js');
const topicDemuxDatabase = require('../../../storage/topicDemuxDatabase');

class TopicDemuxRuntimeStartService extends Service {
  constructor(deviceManager) {
    super(
      DEFAULT_TOPICS.SERVICES.TOPIC_DEMUX_RUNTIME_START,
      MSG_TYPES.TOPIC_DEMUX,
      MSG_TYPES.TOPIC_DEMUX + ', ' + MSG_TYPES.ERROR
    );

    this.deviceManager = deviceManager;
  }

  reply(specs) {
    try {
      let demuxSpecs = topicDemuxDatabase.getSpecification(specs.id);
      if (demuxSpecs === undefined) {
        demuxSpecs = specs;
      }

      this.deviceManager.addTopicDemux(demuxSpecs);

      return {
        topicDemux: demuxSpecs
      };
    } catch (error) {
      return {
        error: {
          title: 'TopicDemuxRuntimeStartService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString()
        }
      };
    }
  }
}

module.exports = {
  TopicDemuxRuntimeStartService: TopicDemuxRuntimeStartService
};
