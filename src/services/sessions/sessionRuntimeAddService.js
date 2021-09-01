const { Service } = require('./../service.js');
const { SessionManager } = require('../../sessions/sessionManager');

const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class SessionRuntimeAddService extends Service {
  constructor() {
    super(
      DEFAULT_TOPICS.SERVICES.SESSION_RUNTIME_ADD,
      MSG_TYPES.SESSION,
      MSG_TYPES.SESSION + ', ' + MSG_TYPES.ERROR
    );
  }

  reply(msgSessionSpec) {
    // Todo: Change to runtime
    let session = this.sessionManager.getSession(sessionMessage.id);
    if (typeof session === 'undefined') {
      return {
        error: {
          title: 'SessionRuntimeGetService Error',
          message: 'Could not find session with ID ' + sessionMessage.id
        }
      };
    } else {
      return { session: session.toProtobuf() };
    }
  }
}

module.exports = { SessionRuntimeAddService };
