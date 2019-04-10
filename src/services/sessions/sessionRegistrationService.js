const {Service} = require('./../service.js');
const SessionDatabase = require('../../storage/sessionDatabase');

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class SessionRegistrationService extends Service {
  constructor(sessionManager) {
    super(DEFAULT_TOPICS.SERVICES.SESSION_REGISTRATION);

    this.sessionManager = sessionManager;
  }

  reply(message) {
    try {
      let session = this.sessionManager.createSession(message);
      SessionDatabase.saveSessionSpecsToFile(session.toProtobuf());
    } catch (error) {
      return {
        error: {
          title: 'SessionRegistrationService Error',
          message: error.toString()
        }
      }
    }

    return {
      success: {
        title: 'SessionRegistrationService Success',
        message: 'Saved session with ID ' + message.id + ' to database'
      }
    }
  }
}

module.exports = {
  'SessionRegistrationService': SessionRegistrationService
};