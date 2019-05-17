const {Service} = require('./../service.js');
const SessionDatabase = require('../../storage/sessionDatabase');

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class SessionDeleteService extends Service {
  constructor() {
    super(DEFAULT_TOPICS.SERVICES.SESSION_DELETE);
  }

  reply(sessionMessage) {
    let session = SessionDatabase.getSession(sessionMessage.id);
    if (typeof session === 'undefined') {
      return {
        error: {
          title: 'SessionDeleteService Error',
          message: 'Could not find session with ID ' + sessionMessage.id
        }
      };
    } else {
      try {
        SessionDatabase.deleteSession(sessionMessage.id)
      } catch(error) {
        return {
          error: {
            title: 'SessionDeleteService Error',
            message: error
          }
        };
      }

      return {
        success: {
          title: 'SessionDeleteService',
          message: 'Successfully deleted session with ID ' + sessionMessage.id
        }
      };
    }
  }
}

module.exports = {
  'SessionDeleteService': SessionDeleteService
};