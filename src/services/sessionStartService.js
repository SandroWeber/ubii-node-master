const {
  Service
} = require('./service.js');

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class SessionStartService extends Service {
  constructor(sessionManager) {
    super(DEFAULT_TOPICS.SERVICES.SESSION_START);

    this.sessionManager = sessionManager;
  }

  reply(message) {
    if (this.sessionManager.startSession(message.id)) {
      return {
        success: {
          title: 'SessionStartService',
          message: 'Start session (ID ' + message.id + ') SUCCESS'
        }
      }
    } else {
      return {
        error: {
          title: 'SessionStartService',
          message: 'Start session (ID ' + message.id + ') FAILED'
        }
      }
    }
  }
}

module.exports = {
  'SessionStartService': SessionStartService,
};