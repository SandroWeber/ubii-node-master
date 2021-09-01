const { Service } = require('../service.js');

const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class SessionRuntimeStopService extends Service {
  constructor(sessionManager) {
    super(
      DEFAULT_TOPICS.SERVICES.SESSION_RUNTIME_STOP,
      MSG_TYPES.SESSION,
      MSG_TYPES.SUCCESS + ', ' + MSG_TYPES.ERROR
    );

    this.sessionManager = sessionManager;
  }

  reply(message) {
    if (typeof message === 'undefined') {
      return {
        error: {
          title: 'SessionRuntimeStopService Error',
          message: 'No session specifications given'
        }
      };
    }

    if (this.sessionManager.stopSessionByID(message.id)) {
      return {
        success: {
          title: 'SessionRuntimeStopService Success',
          message: 'Stop session (ID ' + message.id + ') SUCCESS'
        }
      };
    } else {
      return {
        error: {
          title: 'SessionRuntimeStopService Error',
          message: 'Stop session (ID ' + message.id + ') FAILED'
        }
      };
    }
  }
}

module.exports = { SessionRuntimeStopService };
