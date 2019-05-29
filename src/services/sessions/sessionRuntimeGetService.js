const {Service} = require('./../service.js');
const SessionDatabase = require('../../storage/sessionDatabase');

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class SessionRuntimeGetService extends Service {
  constructor() {
    super(DEFAULT_TOPICS.SERVICES.SESSION_GET);
  }

  reply(sessionMessage) {
    // Todo: Change to runtime
    let session = SessionDatabase.getSession(sessionMessage.id);
    if (typeof session === 'undefined') {
      return {
        error: {
          title: 'SessionRuntimeGetService Error',
          message: 'Could not find session with ID ' + sessionMessage.id
        }
      };
    } else {
      return {session: session.toProtobuf()};
    }
  }
}

module.exports = {
  'SessionRuntimeGetService': SessionRuntimeGetService
};