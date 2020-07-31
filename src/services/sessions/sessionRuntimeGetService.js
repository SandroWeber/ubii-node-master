const { Service } = require('./../service.js');
const SessionDatabase = require('../../storage/sessionDatabase');

const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class SessionRuntimeGetService extends Service {
  constructor(sessionManager) {
    super(
      DEFAULT_TOPICS.SERVICES.SESSION_RUNTIME_GET,
      MSG_TYPES.SESSION,
      MSG_TYPES.SESSION + ', ' + MSG_TYPES.ERROR
    );
    this.sessionManager = sessionManager;
  }

  reply(sessionMessage) {
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

module.exports = {
  SessionRuntimeGetService: SessionRuntimeGetService
};
