const { Service } = require('./../service.js');
const SessionDatabase = require('../../storage/sessionDatabase');

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class SessionRegistrationService extends Service {
  constructor(sessionManager) {
    super(DEFAULT_TOPICS.SERVICES.SESSION_REGISTRATION);

    this.sessionManager = sessionManager;
  }

  reply(sessionSpecs) {
    if (typeof sessionSpecs === 'undefined') {
      return {
        error: {
          title: 'SessionRegistrationService Error',
          message: 'Session specifications are undefined.',
        },
      };
    }

    if (Array.isArray(sessionSpecs)) {
      let newSessions = [];
      sessionSpecs.forEach((spec) => {
        try {
          spec.id = undefined; // ID is assigned by server upon creation
          let session = this.sessionManager.createSession(spec);
          newSessions.push(session);
          SessionDatabase.addSession(session.toProtobuf());
        } catch (error) {
          return {
            error: {
              title: 'SessionRegistrationService Error',
              message: error.toString(),
            },
          };
        }
      });

      return {
        sessionList: newSessions.map((session) => {
          return session.toProtobuf();
        }),
      };
    }

    let session;
    try {
      session = this.sessionManager.createSession(sessionSpecs);
      SessionDatabase.addSession(session.toProtobuf());
    } catch (error) {
      return {
        error: {
          title: 'SessionRegistrationService Error',
          message: error.toString(),
        },
      };
    }

    return { session: session.toProtobuf() };
  }
}

module.exports = {
  SessionRegistrationService: SessionRegistrationService,
};
