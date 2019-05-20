const {
  Service
} = require('./service.js');
const namida = require("@tum-far/namida");

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class TopicDeMuxRegistrationService extends Service {
  constructor(clientManager, deviceManager) {
    super(DEFAULT_TOPICS.SERVICES.TOPIC_MUX_DEMUX_REGISTRATION);

    this.clientManager = clientManager;
    this.deviceManager = deviceManager;
  }

  reply(message) {
    //TODO: implement
  }
}

module.exports = {
  'TopicDeMuxRegistrationService': TopicDeMuxRegistrationService,
};