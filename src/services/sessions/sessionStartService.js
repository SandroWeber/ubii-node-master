const {DEFAULT_TOPICS} = require('@tum-far/ubii-msg-formats');

const {Service} = require('./../service.js');
const SessionDatabase = require('../../storage/sessionDatabase');

class SessionStartService extends Service {
  constructor(sessionManager) {
    super(DEFAULT_TOPICS.SERVICES.SESSION_START);

    this.sessionManager = sessionManager;
  }

  reply(message) {
    // check session manager for existing session by ID
    if (this.sessionManager.getSession(message.id)) {
      try {
        this.sessionManager.startSession(message.id);
      } catch (error) {
        return {
          error: {
            title: 'SessionStartService Error',
            message: error.toString()
          }
        }
      }

      return {
        success: {
          title: 'SessionStartService Success',
          message: 'Started existing session with ID ' + message.id
        }
      }
    }

    // check session database for existing session by ID
    if (SessionDatabase.hasSessionSpecsByID(message.id)) {
      try {
        let specs = SessionDatabase.getSessionSpecsByID(message.id);
        let session = this.sessionManager.createSession(specs);
        this.sessionManager.startSession(session.id);
      } catch (error) {
        return {
          error: {
            title: 'SessionStartService Error',
            message: error.toString()
          }
        }
      }

      return {
        success: {
          title: 'SessionStartService Success',
          message: 'Loaded existing session with ID ' + message.id + ' from database'
        }
      }
    }

    // try creating new session from message
    try {
      let session = this.sessionManager.createSession(message);
      this.sessionManager.startSession(session.id);
    } catch (error) {
      return {
        error: {
          title: 'SessionStartService Error',
          message: error.toString()
        }
      }
    }

    return {
      success: {
        title: 'SessionStartService Success',
        message: 'Created new session from message'
      }
    };
  }
}

module.exports = {
  'SessionStartService': SessionStartService,
};