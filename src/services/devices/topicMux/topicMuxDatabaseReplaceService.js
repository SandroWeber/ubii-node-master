const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../../service.js');
const topicMuxDatabase = require('../../../storage/topicMuxDatabase');

class TopicMuxDatabaseReplaceService extends Service {
  constructor() {
    super(
      DEFAULT_TOPICS.SERVICES.TOPIC_MUX_DATABASE_REPLACE,
      MSG_TYPES.TOPIC_MUX,
      MSG_TYPES.SUCCESS + ', ' + MSG_TYPES.ERROR
    );
  }

  reply(specs) {
    try {
      topicMuxDatabase.updateSpecification(specs);

      return {
        success: {
          title: 'TopicMuxDatabaseReplaceService Success',
          message: 'Successfully updated topic mux with ID ' + specs.id
        }
      };
    } catch (error) {
      return {
        error: {
          title: 'TopicMuxDatabaseReplaceService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString()
        }
      };
    }
  }
}

module.exports = {
  TopicMuxDatabaseReplaceService: TopicMuxDatabaseReplaceService
};
