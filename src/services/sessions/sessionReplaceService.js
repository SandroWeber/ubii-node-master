const {Service} = require('./../service.js');
const SessionDatabase = require('../../storage/sessionDatabase');

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class SessionReplaceService extends Service {
  constructor() {
    super(DEFAULT_TOPICS.SERVICES.SESSION_REPLACE);
  }

  reply(sessionSpecs) {
    if (!SessionDatabase.verifySpecification(sessionSpecs)) {
      return {
        error: {
          title: 'SessionGetService Error',
          message: 'Could not verify session with ID ' + sessionSpecs.id
        }
      };
    }

    try {
      SessionDatabase.updateSession(sessionSpecs);
    } catch (error) {
      return {
        error: {
          title: 'SessionGetService Error',
          message: error.toString()
        }
      };
    }

    return {
      success: {
        title: 'SessionReplaceService',
        message: 'Successfully replaced session with ID ' + sessionSpecs.id
      }
    };
  }
}

module.exports = {
  'SessionReplaceService': SessionReplaceService
};