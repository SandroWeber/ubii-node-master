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
    console.info(message);
    return this.sessionManager.createSession(message);
  }
}

module.exports = {
  'SessionRegistrationService': SessionRegistrationService,
};