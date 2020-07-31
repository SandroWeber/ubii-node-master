const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../../service.js');
const topicMuxDatabase = require('../../../storage/topicMuxDatabase');

class TopicMuxDatabaseAddService extends Service {
  constructor() {
    super(
      DEFAULT_TOPICS.SERVICES.TOPIC_MUX_DATABASE_ADD,
      MSG_TYPES.TOPIC_MUX,
      MSG_TYPES.TOPIC_MUX + ', ' + MSG_TYPES.ERROR
    );
  }

  reply(specs) {
    try {
      let muxSpecs = topicMuxDatabase.addSpecification(specs);

      return {
        topicMux: muxSpecs
      };
    } catch (error) {
      return {
        error: {
          title: 'TopicMuxDatabaseAddService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString()
        }
      };
    }
  }
}

module.exports = {
  TopicMuxDatabaseAddService: TopicMuxDatabaseAddService
};
