const { Service } = require('./../service.js');
const SessionStorage = require('../../storage/sessionStorage');

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
    let sessions = SessionStorage.getSessionList();
    if (typeof sessions === 'undefined') {
      return {
        error: {
          title: 'SessionDatabaseGetListService Error',
          message: 'Could not retrieve session list'
        }
      };
    } else {
      return {
        sessionList: {
          elements: sessions.map(session => session.toProtobuf())
        } 
      };
    }
  }
}

module.exports = {
  SessionDatabaseGetListService: SessionDatabaseGetListService
};
