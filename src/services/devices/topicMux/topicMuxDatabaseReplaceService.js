const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../../service.js');
const topicMuxDatabase = require('../../../storage/topicMuxDatabase');

class TopicMuxDatabaseReplaceService extends Service {
  constructor() {
    super(DEFAULT_TOPICS.SERVICES.TOPIC_MUX_DATABASE_REPLACE);
  }

  reply(specs) {
    try {
      topicMuxDatabase.updateSpecification(specs);

      return {
        success: {
          title: 'TopicMuxDatabaseReplaceService',
          message: 'Successfully updated topic mux with ID ' + specs.id
        }
      }
    }
    catch (error) {
      return {
        error: {
          title: 'TopicMuxDatabaseReplaceService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString()
        }
      }
    }
  }
}

module.exports = {
  'TopicMuxDatabaseReplaceService': TopicMuxDatabaseReplaceService,
};