const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../../service.js');
const topicDemuxDatabase = require('../../../storage/topicDemuxDatabase');

class TopicDemuxDatabaseAddService extends Service {
  constructor() {
    super(
      DEFAULT_TOPICS.SERVICES.TOPIC_DEMUX_DATABASE_ADD,
      MSG_TYPES.TOPIC_DEMUX,
      MSG_TYPES.TOPIC_DEMUX + ', ' + MSG_TYPES.ERROR
    );
  }

  reply(specs) {
    try {
      let demuxSpecs = topicDemuxDatabase.addSpecification(specs);

      return {
        topicDemux: demuxSpecs.toProtobuf()
      };
    } catch (error) {
      return {
        error: {
          title: 'TopicDemuxDatabaseAddService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString()
        }
      };
    }
  }
}

module.exports = {
  TopicDemuxDatabaseAddService: TopicDemuxDatabaseAddService
};
