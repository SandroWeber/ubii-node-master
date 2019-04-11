const {
  Service
} = require('./../service.js');

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class SessionStopService extends Service {
  constructor(sessionManager) {
    super(DEFAULT_TOPICS.SERVICES.SESSION_STOP);

    this.sessionManager = sessionManager;
  }

  reply(message) {
    if (typeof message === 'undefined') {
      return {
        error: {
          title: 'SessionStopService Error',
          message: 'No session specifications given'
        }
      }
    }

    if (this.sessionManager.stopSession(message.id)) {
      return {
        success: {
          title: 'SessionStopService Success',
          message: 'Stop session (ID ' + message.id + ') SUCCESS'
        }
      }
    } else {
      return {
        error: {
          title: 'SessionStopService Error',
          message: 'Stop session (ID ' + message.id + ') FAILED'
        }
      }
    }
  }
}

module.exports = {
  'SessionStopService': SessionStopService,
};