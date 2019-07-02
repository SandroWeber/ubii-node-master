const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../../service.js');
const topicMuxDatabase = require('../../../storage/topicMuxDatabase');

class TopicMuxDatabaseGetService extends Service {
  constructor() {
    super(DEFAULT_TOPICS.SERVICES.TOPIC_MUX_DATABASE_GET);
  }

  reply(specs) {
    try {
      let muxSpecs = topicMuxDatabase.getSpecification(specs.id);

      return {
        topicMux: muxSpecs
      }
    }
    catch (error) {
      return {
        error: {
          title: 'TopicMuxDatabaseGetService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString()
        }
      }
    }
  }
}

module.exports = {
  'TopicMuxDatabaseGetService': TopicMuxDatabaseGetService,
};