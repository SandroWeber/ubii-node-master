const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../../service.js');
const topicDemuxDatabase = require('../../../storage/topicDemuxDatabase');

class TopicDemuxDatabaseGetService extends Service {
  constructor() {
    super(DEFAULT_TOPICS.SERVICES.TOPIC_DEMUX_DATABASE_GET);
  }

  reply(specs) {
    try {
      let demuxSpecs = topicDemuxDatabase.getSpecification(specs.id);

      return {
        topicDemux: demuxSpecs
      }
    }
    catch (error) {
      return {
        error: {
          title: 'TopicDemuxDatabaseGetService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString()
        }
      }
    }
  }
}

module.exports = {
  'TopicDemuxDatabaseGetService': TopicDemuxDatabaseGetService,
};