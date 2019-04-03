const {
  Service
} = require('./service.js');
const SessionDatabase = require('../storage/sessionDatabase');

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class SessionRegistrationService extends Service {
  constructor(sessionManager) {
    super(DEFAULT_TOPICS.SERVICES.SESSION_REGISTRATION);

    this.sessionManager = sessionManager;
  }

  reply(message) {
    let session = this.sessionManager.createSession(message);

    SessionDatabase.saveSessionToFile(session);

    return {session: session.toProtobuf()};
  }
}

module.exports = {
  'SessionRegistrationService': SessionRegistrationService
};