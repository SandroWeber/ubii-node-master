const {Service} = require('./../service.js');
const SessionDatabase = require('../../storage/sessionDatabase');

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class SessionDatabaseGetListService extends Service {
  constructor() {
    super(DEFAULT_TOPICS.SERVICES.SESSION_DATABASE_GET_LIST);
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
  'SessionDatabaseGetListService': SessionDatabaseGetListService
};