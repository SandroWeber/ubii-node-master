const {Service} = require('./../service.js');
const SessionDatabase = require('../../storage/sessionDatabase');

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class SessionDatabaseGetService extends Service {
  constructor() {
    super(DEFAULT_TOPICS.SERVICES.SESSION_DATABASE_GET);
  }

  reply(sessionMessage) {
    let session = SessionDatabase.getSession(sessionMessage.id);
    if (typeof session === 'undefined') {
      return {
        error: {
          title: 'SessionDatabaseGetService Error',
          message: 'Could not find session with ID ' + sessionMessage.id
        }
      };
    } else {
      return {session: session.toProtobuf()};
    }
  }
}

module.exports = {
  'SessionDatabaseGetService': SessionDatabaseGetService
};