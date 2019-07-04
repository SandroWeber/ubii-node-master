const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../../service.js');
const topicMuxDatabase = require('../../../storage/topicMuxDatabase');

class TopicMuxRuntimeStartService extends Service {
  constructor(deviceManager) {
    super(DEFAULT_TOPICS.SERVICES.TOPIC_MUX_RUNTIME_START);

    this.deviceManager = deviceManager;
  }

  reply(specs) {
    try {
      let muxSpecs = topicMuxDatabase.getSpecification(specs.id);
      if (muxSpecs === undefined) {
        muxSpecs = specs;
      }

      this.deviceManager.addTopicMux(muxSpecs);

      return {
        topicMux: muxSpecs
      };
    }
    catch (error) {
      return {
        error: {
          title: 'TopicMuxRuntimeStartService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString()
        }
      };
    }
  }
}

module.exports = {
  'TopicMuxRuntimeStartService': TopicMuxRuntimeStartService,
};