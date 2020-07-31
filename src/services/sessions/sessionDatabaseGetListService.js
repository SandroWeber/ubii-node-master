const { Service } = require('./../service.js');
const SessionDatabase = require('../../storage/sessionDatabase');

const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class SessionDatabaseGetListService extends Service {
  constructor() {
    super(
      DEFAULT_TOPICS.SERVICES.SESSION_DATABASE_GET_LIST,
      undefined,
      MSG_TYPES.SESSION_LIST + ', ' + MSG_TYPES.ERROR
    );
  }

  reply() {
    let sessions = SessionDatabase.getSessionList();
    if (typeof sessions === 'undefined') {
      return {
        error: {
          title: 'SessionDatabaseGetListService Error',
          message: 'Could not retrieve session list'
        }
      };
    } else {
      return {
        sessionList: sessions
      };
    }
  }
}

module.exports = {
  SessionDatabaseGetListService: SessionDatabaseGetListService
};
