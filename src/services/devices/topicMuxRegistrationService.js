const {
  Service
} = require('../service.js');
const namida = require("@tum-far/namida");

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class TopicMuxRegistrationService extends Service {
  constructor(clientManager, deviceManager) {
    super(DEFAULT_TOPICS.SERVICES.TOPIC_MUX_REGISTRATION);

    this.clientManager = clientManager;
    this.deviceManager = deviceManager;
  }

  reply(specs) {
    try {
      let mux = this.deviceManager.processTopicMuxRegistration(specs);

      return {
        topicMux: mux.toProtobuf()
      }
    }
    catch (error) {
      return {
        error: {
          title: 'TopicMuxRegistrationService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString()
        }
      }
    }
  }
}

module.exports = {
  'TopicMuxRegistrationService': TopicMuxRegistrationService,
};