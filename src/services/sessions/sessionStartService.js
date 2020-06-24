const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

const { Service } = require('./../service.js');
const SessionDatabase = require('../../storage/sessionDatabase');

class SessionStartService extends Service {
  constructor(sessionManager) {
    super(DEFAULT_TOPICS.SERVICES.SESSION_START);

    this.sessionManager = sessionManager;
  }

  reply(message) {
    if (typeof message === 'undefined') {
      return {
        error: {
          title: 'SessionStartService Error',
          message: 'No session specifications given',
        },
      };
    }

    // check session manager for existing session by ID
    let session = this.sessionManager.getSession(message.id);
    if (session) {
      try {
        this.sessionManager.startSessionByID(message.id);

        return {
          session: session.toProtobuf(),
        };
      } catch (error) {
        return {
          error: {
            title: 'SessionStartService Error',
            message: error.toString(),
            stack: error.stack && error.stack.toString(),
          },
        };
      }
    }

    // check session database for existing session by ID
    if (SessionDatabase.hasSession(message)) {
      try {
        let specs = SessionDatabase.getSession(message.id);
        let session = this.sessionManager.createSession(specs);
        this.sessionManager.startSessionByID(session.id);

        return {
          session: specs,
        };
      } catch (error) {
        return {
          error: {
            title: 'SessionStartService Error',
            message: error.toString(),
            stack: error.stack && error.stack.toString(),
          },
        };
      }
    }

    // try creating new session from message
    try {
      let session = this.sessionManager.createSession(message);
      this.sessionManager.startSessionByID(session.id);

      return {
        session: session,
      };
    } catch (error) {
      return {
        error: {
          title: 'SessionStartService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString(),
        },
      };
    }
  }
}

module.exports = {
  SessionStartService: SessionStartService,
};
