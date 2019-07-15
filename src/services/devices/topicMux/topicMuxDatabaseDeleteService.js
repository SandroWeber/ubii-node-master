const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../../service.js');
const topicMuxDatabase = require('../../../storage/topicMuxDatabase');

class TopicMuxDatabaseDeleteService extends Service {
  constructor() {
    super(DEFAULT_TOPICS.SERVICES.TOPIC_MUX_DATABASE_DELETE);
  }

  reply(specs) {
    try {
      topicMuxDatabase.deleteSpecification(specs.id);

      return {
        success: {
          title: 'TopicMuxDatabaseDeleteService',
          message: 'Successfully deleted topic mux with ID ' + specs.id
        }
      }
    }
    catch (error) {
      return {
        error: {
          title: 'TopicMuxDatabaseDeleteService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString()
        }
      }
    }
  }
}

module.exports = {
  'TopicMuxDatabaseDeleteService': TopicMuxDatabaseDeleteService,
};