const {Service} = require('./../service.js');

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class SessionGetRuntimeListService extends Service {
  constructor(sessionManager) {
    super(DEFAULT_TOPICS.SERVICES.SESSION_GET_RUNTIME_LIST);

    this.sessionManager = sessionManager;
  }

  reply() {
    let sessions = this.sessionManager.getSessionList();
    if (typeof sessions === 'undefined') {
      return {
        error: {
          title: 'SessionGetRuntimeListService Error',
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
  'SessionGetRuntimeListService': SessionGetRuntimeListService
};