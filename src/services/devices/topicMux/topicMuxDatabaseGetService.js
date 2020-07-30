const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../../service.js');
const topicMuxDatabase = require('../../../storage/topicMuxDatabase');

class TopicMuxDatabaseGetService extends Service {
  constructor() {
    super(DEFAULT_TOPICS.SERVICES.TOPIC_MUX_DATABASE_GET, MSG_TYPES.TOPIC_MUX, MSG_TYPES.TOPIC_MUX);
  }

  reply(specs) {
    try {
      let muxSpecs = topicMuxDatabase.getSpecification(specs.id);

      return {
        topicMux: muxSpecs
      };
    } catch (error) {
      return {
        error: {
          title: 'TopicMuxDatabaseGetService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString()
        }
      };
    }
  }
}

module.exports = {
  TopicMuxDatabaseGetService: TopicMuxDatabaseGetService
};
