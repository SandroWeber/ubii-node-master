const {
  Service
} = require('../service.js');
const namida = require("@tum-far/namida");

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class TopicDemuxRegistrationService extends Service {
  constructor(deviceManager) {
    super(DEFAULT_TOPICS.SERVICES.TOPIC_DEMUX_REGISTRATION);

    this.deviceManager = deviceManager;
  }

  reply(specs) {
    //TODO: extend with DB after merge for UBII-83 (storage unification)
    try {
      let demux = this.deviceManager.processTopicDemuxRegistration(specs);

      return {
        topicDemux: demux.toProtobuf()
      }
    }
    catch (error) {
      return {
        error: {
          title: 'TopicDemuxRegistrationService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString()
        }
      }
    }
  }
}

module.exports = {
  'TopicDemuxRegistrationService': TopicDemuxRegistrationService,
};