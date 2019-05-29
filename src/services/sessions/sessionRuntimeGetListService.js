const {Service} = require('./../service.js');

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class SessionRuntimeGetListService extends Service {
  constructor(sessionManager) {
    super(DEFAULT_TOPICS.SERVICES.SESSION_RUNTIME_GET_LIST);

    this.sessionManager = sessionManager;
  }

  reply() {
    let sessions = this.sessionManager.getSessionList();
    if (typeof sessions === 'undefined') {
      return {
        error: {
          title: 'SessionRuntimeGetListService Error',
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
  'SessionRuntimeGetListService': SessionRuntimeGetListService
};