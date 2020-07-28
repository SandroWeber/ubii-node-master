const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('./../service.js');
const SessionDatabase = require('../../storage/sessionDatabase');

class SessionStartService extends Service {
  constructor(sessionManager) {
    super(DEFAULT_TOPICS.SERVICES.SESSION_RUNTIME_START, MSG_TYPES.SESSION, MSG_TYPES.SESSION);

    this.sessionManager = sessionManager;
  }

  reply(sessionSpecs) {
    if (typeof sessionSpecs === 'undefined') {
      return {
        error: {
          title: 'SessionStartService Error',
          message: 'No session specifications given'
        }
      };
    }

    // check session manager for existing session by ID
    let session = this.sessionManager.getSession(sessionSpecs.id);
    if (session) {
      try {
        this.sessionManager.startSessionByID(sessionSpecs.id);

        return {
          session: session.toProtobuf()
        };
      } catch (error) {
        return {
          error: {
            title: 'SessionStartService Error',
            message: error.toString(),
            stack: error.stack && error.stack.toString()
          }
        };
      }
    }

    // check session database for existing session by ID
    if (SessionDatabase.hasSession(sessionSpecs)) {
      try {
        let specs = SessionDatabase.getSession(sessionSpecs.id);
        let session = this.sessionManager.createSession(specs);
        this.sessionManager.startSessionByID(session.id);

        return {
          session: specs
        };
      } catch (error) {
        return {
          error: {
            title: 'SessionStartService Error',
            message: error.toString(),
            stack: error.stack && error.stack.toString()
          }
        };
      }
    }

    // try creating new session from message
    try {
      sessionSpecs.id = undefined; // ID is assigned by server upon creation
      let session = this.sessionManager.createSession(sessionSpecs);
      this.sessionManager.startSessionByID(session.id);

      return {
        session: session.toProtobuf()
      };
    } catch (error) {
      return {
        error: {
          title: 'SessionStartService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString()
        }
      };
    }
  }
}

module.exports = {
  SessionStartService: SessionStartService
};
