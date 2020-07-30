const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../../service.js');
const topicMuxDatabase = require('../../../storage/topicMuxDatabase');

class TopicMuxDatabaseGetListService extends Service {
  constructor() {
    super(DEFAULT_TOPICS.SERVICES.TOPIC_MUX_DATABASE_GET_LIST, undefined, MSG_TYPES.TOPIC_MUX_LIST);
  }

  reply() {
    try {
      let muxSpecsList = topicMuxDatabase.getSpecificationList();

      return {
        topicMuxList: muxSpecsList
      };
    } catch (error) {
      return {
        error: {
          title: 'TopicMuxDatabaseGetListService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString()
        }
      };
    }
  }
}

module.exports = {
  TopicMuxDatabaseGetListService: TopicMuxDatabaseGetListService
};
