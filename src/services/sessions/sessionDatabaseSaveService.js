const { Service } = require('../service.js');
const SessionStorage = require('../../storage/sessionStorage');

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
        if (SessionStorage.has(spec)) {
          SessionStorage.updateSession(spec);
        }
        // new session
        else {
          spec.id = undefined; // ID is assigned by server upon creation
          let session = this.sessionManager.createSession(spec);
          newSessions.push(session);
          SessionStorage.addProto(session.toProtobuf());
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
