const {Service} = require('./../service.js');
const SessionDatabase = require('../../storage/sessionDatabase');

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class SessionRegistrationService extends Service {
  constructor() {
    super(DEFAULT_TOPICS.SERVICES.INTERACTION_REGISTRATION);
  }

  reply(sessionSpecs) {
    if (typeof sessionSpecs === 'undefined') {
      return {
        error: {
          title: 'SessionRegistrationService Error',
          message: 'Session specifications are undefined.'
        }
      };
    }

    if (Array.isArray(sessionSpecs)) {
      let newSessions = [];
      sessionSpecs.forEach((spec) => {
        try {
          newSessions.push(SessionDatabase.addSession(spec));
        } catch (error) {
          return {
            error: {
              title: 'SessionRegistrationService Error',
              message: error.toString()
            }
          };
        }
      });

      return {
        sessionList: newSessions.map((session) => {return session.toProtobuf()})
      };
    }

    let session;
    try {
      session = SessionDatabase.addSession(sessionSpecs);
    } catch (error) {
      return {
        error: {
          title: 'SessionRegistrationService Error',
          message: error.toString()
        }
      };
    }

    return {session: session.toProtobuf()};
  }
}

module.exports = {
  'SessionRegistrationService': SessionRegistrationService
};