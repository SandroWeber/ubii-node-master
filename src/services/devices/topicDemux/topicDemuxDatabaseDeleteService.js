const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../../service.js');
const topicDemuxDatabase = require('../../../storage/topicDemuxDatabase');

class TopicDemuxDatabaseDeleteService extends Service {
  constructor() {
    super(DEFAULT_TOPICS.SERVICES.TOPIC_DEMUX_DATABASE_DELETE);
  }

  reply(specs) {
    try {
      topicDemuxDatabase.deleteSpecification(specs.id);

      return {
        success: {
          title: 'TopicDemuxDatabaseDeleteService',
          message: 'Successfully deleted topic demux with ID ' + specs.id
        }
      }
    }
    catch (error) {
      return {
        error: {
          title: 'TopicDemuxDatabaseDeleteService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString()
        }
      }
    }
  }
}

module.exports = {
  'TopicDemuxDatabaseDeleteService': TopicDemuxDatabaseDeleteService,
};