const { Service } = require('./../service.js');
const { SessionManager } = require('../../sessions/sessionManager');
const SessionDatabase = require('../../storage/sessionDatabase');

const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class SessionRuntimeAddService extends Service {
  constructor() {
    super(
      DEFAULT_TOPICS.SERVICES.SESSION_RUNTIME_ADD,
      MSG_TYPES.SESSION,
      MSG_TYPES.SESSION + ', ' + MSG_TYPES.ERROR
    );
  }

  reply(sessionSpecs) {
    if (typeof sessionSpecs === 'undefined') {
      return {
        error: {
          title: 'SessionRuntimeAddService Error',
          message: 'No session specifications given'
        }
      };
    }

    try {
      let specs = undefined;
      if (SessionDatabase.has(sessionSpecs)) {
        // check session database
        specs = SessionDatabase.getByName(sessionSpecs.name).fileData;
      }
      else {
        // try creating new session from message
        specs = sessionSpecs;
        specs.id = undefined; // ID is assigned by server upon creation
      }

      let session = SessionManager.instance.createSession(specs);
      return {
        session: session.toProtobuf()
      };
    } catch (error) {
      return {
        error: {
          title: 'SessionRuntimeAddService Error',
          message: error.toString(),
          stack: error.stack && error.stack.toString()
        }
      };
    }
  }
}

module.exports = { SessionRuntimeAddService };
