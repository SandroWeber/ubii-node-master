const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../../service.js');
const topicDemuxDatabase = require('../../../storage/topicDemuxDatabase');

class TopicDemuxDatabaseGetListService extends Service {
  constructor() {
    super(DEFAULT_TOPICS.SERVICES.TOPIC_DEMUX_DATABASE_GET_LIST);
  }

  reply() {
    try {
      let demuxSpecsList = topicDemuxDatabase.getSpecificationList();

      return {
        topicDemuxList: demuxSpecsList
      }
    }
    catch (error) {
      return {
        error: {
          title: 'TopicDemuxDatabaseGetListService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString()
        }
      }
    }
  }
}

module.exports = {
  'TopicDemuxDatabaseGetListService': TopicDemuxDatabaseGetListService,
};