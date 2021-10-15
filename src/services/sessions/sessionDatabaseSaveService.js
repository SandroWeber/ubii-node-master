const { Service } = require('../service.js');
const SessionDatabase = require('../../storage/sessionDatabase');

const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class SessionDatabaseSaveService extends Service {
  constructor(sessionManager) {
    super(
      DEFAULT_TOPICS.SERVICES.SESSION_DATABASE_SAVE,
      MSG_TYPES.SESSION + ', ' + MSG_TYPES.SESSION_LIST,
      MSG_TYPES.SESSION_LIST + ', ' + MSG_TYPES.ERROR
    );

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

    if (sessionSpecs.elements) {
      sessionSpecs = sessionSpecs.elements;
    }
    else if (!Array.isArray(sessionSpecs)) {
      sessionSpecs = [sessionSpecs];
    }

    let newSessions = [];
    sessionSpecs.forEach((spec) => {
      try {
        if (SessionDatabase.has(spec)) {
          SessionDatabase.updateSession(spec);
        }
        // new session
        else {
          spec.id = undefined; // ID is assigned by server upon creation
          let session = this.sessionManager.createSession(spec);
          newSessions.push(session);
          SessionDatabase.addProto(session.toProtobuf());
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
      sessionList: {
        elements: newSessions.map(session => {
          return session.toProtobuf();
        })
      }
    };
  }
}

module.exports = {
  SessionDatabaseSaveService: SessionDatabaseSaveService
};
