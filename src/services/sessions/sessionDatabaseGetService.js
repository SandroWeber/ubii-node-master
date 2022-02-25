const { Service } = require('./../service.js');
const SessionStorage = require('../../storage/sessionStorage');

const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class SessionDatabaseGetService extends Service {
  constructor() {
    super(
      DEFAULT_TOPICS.SERVICES.SESSION_DATABASE_GET,
      MSG_TYPES.SESSION,
      MSG_TYPES.SESSION + ', ' + MSG_TYPES.ERROR
    );
  }

  reply(sessionMessage) {
    let session = SessionStorage.getSession(sessionMessage.id);
    if (typeof session === 'undefined') {
      return {
        error: {
          title: 'SessionDatabaseGetService Error',
          message: 'Could not find session with ID ' + sessionMessage.id
        }
      };
    } else {
      return { session: session.toProtobuf() };
    }
  }
}

module.exports = {
  SessionDatabaseGetService: SessionDatabaseGetService
};
