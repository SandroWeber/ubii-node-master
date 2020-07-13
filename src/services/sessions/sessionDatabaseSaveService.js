const { Service } = require('../service.js');
const SessionDatabase = require('../../storage/sessionDatabase');

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class SessionDatabaseSaveService extends Service {
  constructor(sessionManager) {
    super(DEFAULT_TOPICS.SERVICES.SESSION_DATABASE_SAVE);

    this.sessionManager = sessionManager;
  }

  reply(sessionSpecs) {
    if (typeof sessionSpecs === 'undefined') {
      return {
        error: {
          title: 'SessionDatabaseSaveService Error',
          message: 'Session specifications are undefined.'
        }
      };
    }

    if (!Array.isArray(sessionSpecs)) {
      sessionSpecs = [sessionSpecs];
    }

    let newSessions = [];
    sessionSpecs.forEach((spec) => {
      try {
        // new session
        if (!spec.id || spec.id === '') {
          spec.id = undefined; // ID is assigned by server upon creation
          let session = this.sessionManager.createSession(spec);
          newSessions.push(session);
          SessionDatabase.addSession(session.toProtobuf());
        }
        // update existing session (known ID)
        else {
          SessionDatabase.updateSession(spec);
        }
      } catch (error) {
        return {
          error: {
            title: 'SessionDatabaseSaveService Error',
            message: error.toString()
          }
        };
      }
    });

    return {
      sessionList: newSessions.map((session) => {
        return session.toProtobuf();
      })
    };
  }
}

module.exports = {
  SessionDatabaseSaveService: SessionDatabaseSaveService
};
