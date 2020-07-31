const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../../service.js');

class TopicDemuxRuntimeGetListService extends Service {
  constructor(deviceManager) {
    super(
      DEFAULT_TOPICS.SERVICES.TOPIC_DEMUX_RUNTIME_GET_LIST,
      undefined,
      MSG_TYPES.TOPIC_DEMUX_LIST
    );

    this.deviceManager = deviceManager;
  }

  reply() {
    try {
      let demuxSpecsList = this.deviceManager.getTopicDemuxList().map((demux) => {
        return demux.toProtobuf();
      });

      return {
        topicDemuxList: demuxSpecsList
      };
    } catch (error) {
      return {
        error: {
          title: 'TopicDemuxRuntimeGetListService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString()
        }
      };
    }
  }
}

module.exports = {
  TopicDemuxRuntimeGetListService: TopicDemuxRuntimeGetListService
};
