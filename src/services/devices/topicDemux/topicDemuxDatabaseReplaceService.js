const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../../service.js');
const topicDemuxDatabase = require('../../../storage/topicDemuxDatabase');

class TopicDemuxDatabaseReplaceService extends Service {
  constructor() {
    super(
      DEFAULT_TOPICS.SERVICES.TOPIC_DEMUX_DATABASE_REPLACE,
      MSG_TYPES.TOPIC_DEMUX,
      MSG_TYPES.SUCCESS + ', ' + MSG_TYPES.ERROR
    );
  }

  reply(specs) {
    try {
      topicDemuxDatabase.updateSpecification(specs);

      return {
        success: {
          title: 'TopicDemuxDatabaseReplaceService Success',
          message: 'Successfully updated topic demux with ID ' + specs.id
        }
      };
    } catch (error) {
      return {
        error: {
          title: 'TopicDemuxDatabaseReplaceService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString()
        }
      };
    }
  }
}

module.exports = {
  TopicDemuxDatabaseReplaceService: TopicDemuxDatabaseReplaceService
};
