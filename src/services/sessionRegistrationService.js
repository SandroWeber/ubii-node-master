const {
  Service
} = require('./service.js');

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class SessionRegistrationService extends Service {
  constructor(sessionManager) {
    super(DEFAULT_TOPICS.SERVICES.SESSION_REGISTRATION);

    this.sessionManager = sessionManager;
  }

  reply(message) {
    let session = this.sessionManager.createSession(message);

    return {session: session.toProtobuf()};
  }
}

module.exports = {
  'SessionRegistrationService': SessionRegistrationService
};