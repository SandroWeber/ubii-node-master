const EventEmitter = require('events');

const { DEFAULT_TOPICS, MSG_TYPES, proto } = require('@tum-far/ubii-msg-formats');
const SessionStatus = proto.ubii.sessions.SessionStatus;
const namida = require('@tum-far/namida');

const { Session } = require('./session.js');
const { EVENTS_SESSION_MANAGER } = require('./constants');
const Utils = require('../utilities');

let _instance = null;
const SINGLETON_ENFORCER = Symbol();

class SessionManager extends EventEmitter {
  constructor(enforcer) {
    super();

    if (enforcer !== SINGLETON_ENFORCER) {
      throw new Error('Use ' + this.constructor.name + '.instance');
    }

    this.sessions = [];

    this.addEventListeners();
  }

  static get instance() {
    if (_instance == null) {
      _instance = new SessionManager(SINGLETON_ENFORCER);
    }

    return _instance;
  }

  setDependencies(masterNodeID, topicData, processingModuleManager) {
    this.masterNodeID = masterNodeID;
    this.topicData = topicData;
    this.processingModuleManager = processingModuleManager;

    return this;
  }

  createSession(specs = {}) {
    if (specs.id && this.getSession(specs.id)) {
      namida.logFailure('SessionManager', 'Session ID already exists: ' + specs.id);
      throw new Errror('Session with ID ' + specs.id + ' already exists.');
    }

    let session = new Session(specs, this.masterNodeID, this.topicData, this.processingModuleManager);
    if (!session.ioMappings || session.ioMappings.length === 0) {
      namida.warn('SessionManager', session.toString() + ' has no I/O Mappings (topics <-> processing modules)');
    }

    this.addSession(session);
    this.emit(EVENTS_SESSION_MANAGER.NEW_SESSION, session.toProtobuf());

    return session;
  }

  addSession(session) {
    if (
      this.sessions.some((element) => {
        return element.id === session.id;
      })
    ) {
      return;
    }

    if (session instanceof Session) {
      this.sessions.push(session);
      session.addListener(Session.EVENTS.START_FAILURE, (pmList) => {
        namida.logFailure(
          'SessionManager',
          'failure to start ' +
            session.toString() +
            ', list of PMs not running:\n' +
            pmList.map((pm) => 'ProcessingModule "' + pm.name + '" (ID ' + pm.id + ')')
        );
      });
    }
  }

  removeSession(id) {
    for (let i = 0; i < this.sessions.length; i++) {
      if (this.sessions[i].id === id) {
        let sessionSpecs = this.sessions[i].toProtobuf();
        this.sessions.splice(i, 1);
        this.emit(EVENTS_SESSION_MANAGER.DELETE_SESSION, sessionSpecs);
        break;
      }
    }
  }

  removeAllSessions() {
    this.sessions = [];
  }

  getSession(id) {
    return this.sessions.find((session) => {
      return session.id === id;
    });
  }

  getSessionList() {
    return this.sessions;
  }

  startSessionByID(id) {
    let session = this.getSession(id);

    return this.startSession(session);
  }

  startSession(session) {
    session.on(Session.EVENTS.START_SUCCESS, () => {
      namida.logSuccess('SessionManager', 'succesfully started ' + session.toString());
      this.topicData.publish(DEFAULT_TOPICS.INFO_TOPICS.RUNNING_SESSION, {
        topic: DEFAULT_TOPICS.INFO_TOPICS.RUNNING_SESSION,
        type: Utils.getTopicDataTypeFromMessageFormat(MSG_TYPES.SESSION),
        session: session.toProtobuf()
      });
    });
    session.on(Session.EVENTS.START_FAILURE, () => {
      namida.logFailure('SessionManager', 'failed to start ' + session.toString());
    });

    session.start();
    this.emit(EVENTS_SESSION_MANAGER.START_SESSION, session.toProtobuf());
  }

  async startAllSessions() {
    return new Promise((resolve, reject) => {
      let sessionIds = this.sessions.map((session) => session.id);

      for (let session of this.sessions) {
        if (session.status === SessionStatus.RUNNING) {
          sessionIds = sessionIds.filter(id => id !== session.id);
        } else {
          let onSessionStartSuccess = () => {
            sessionIds = sessionIds.filter(id => id !== session.id);
            if (sessionIds.length === 0) {
              namida.logSuccess('SessionManager', 'all sessions started');
              resolve();
            }
          };
          session.addListener(Session.EVENTS.START_SUCCESS, onSessionStartSuccess);
          this.startSession(session);
        }
      }
      
      setTimeout(() => {
        if (sessionIds.length > 0) {
          namida.logFailure('SessionManager', 'failed to start all sessions, remaining: ' + sessionIds);
          reject();
        }
      }, SessionManager.CONSTANTS.TIMEOUT_START_SESSION);
    });

    /*for (let i = 0; i < this.sessions.length; i++) {
      this.startSession(this.sessions[i]);
    }*/
  }

  stopSessionByID(id) {
    let session = this.getSession(id);

    return session && this.stopSession(session);
  }

  stopSession(session) {
    session.on(Session.EVENTS.STOP_SUCCESS, () => {
      namida.logSuccess('SessionManager', 'succesfully stopped ' + session.toString());
    });
    session.on(Session.EVENTS.STOP_FAILURE, () => {
      namida.logFailure('SessionManager', 'failed to stop ' + session.toString());
    });

    session.stop();
    this.emit(EVENTS_SESSION_MANAGER.STOP_SESSION, session.toProtobuf());
  }

  stopAllSessions() {
    for (let i = 0; i < this.sessions.length; i++) {
      this.stopSession(this.sessions[i]);
    }
  }

  /* event related functions */

  addEventListeners() {
    this.on(EVENTS_SESSION_MANAGER.NEW_SESSION, (specs) => {
      this.onEventNewSession(specs);
    });

    this.on(EVENTS_SESSION_MANAGER.CHANGE_SESSION, (specs) => {
      this.onEventSessionChange(specs);
    });

    this.on(EVENTS_SESSION_MANAGER.DELETE_SESSION, (specs) => {
      this.onEventSessionChange(specs);
    });

    this.on(EVENTS_SESSION_MANAGER.START_SESSION, (specs) => {
      this.onEventSessionStart(specs);
    });

    this.on(EVENTS_SESSION_MANAGER.STOP_SESSION, (specs) => {
      this.onEventSessionStop(specs);
    });
  }

  onEventNewSession(sessionSpecs) {
    this.topicData.publish(DEFAULT_TOPICS.INFO_TOPICS.NEW_SESSION, {
      topic: DEFAULT_TOPICS.INFO_TOPICS.NEW_SESSION,
      type: Utils.getTopicDataTypeFromMessageFormat(MSG_TYPES.SESSION),
      session: sessionSpecs
    });
  }

  onEventSessionChange(sessionSpecs) {
    this.topicData.publish(DEFAULT_TOPICS.INFO_TOPICS.CHANGE_SESSION, {
      topic: DEFAULT_TOPICS.INFO_TOPICS.CHANGE_SESSION,
      type: Utils.getTopicDataTypeFromMessageFormat(MSG_TYPES.SESSION),
      session: sessionSpecs
    });
  }

  onEventSessionDelete(sessionSpecs) {
    this.topicData.publish(DEFAULT_TOPICS.INFO_TOPICS.DELETE_SESSION, {
      topic: DEFAULT_TOPICS.INFO_TOPICS.DELETE_SESSION,
      type: Utils.getTopicDataTypeFromMessageFormat(MSG_TYPES.SESSION),
      session: sessionSpecs
    });
  }

  onEventSessionStart(sessionSpecs) {
    this.topicData.publish(DEFAULT_TOPICS.INFO_TOPICS.START_SESSION, {
      topic: DEFAULT_TOPICS.INFO_TOPICS.START_SESSION,
      type: Utils.getTopicDataTypeFromMessageFormat(MSG_TYPES.SESSION),
      session: sessionSpecs
    });
  }

  onEventSessionStop(sessionSpecs) {
    this.topicData.publish(DEFAULT_TOPICS.INFO_TOPICS.STOP_SESSION, {
      topic: DEFAULT_TOPICS.INFO_TOPICS.STOP_SESSION,
      type: Utils.getTopicDataTypeFromMessageFormat(MSG_TYPES.SESSION),
      session: { id: sessionSpecs.id }
    });
  }

  verifyRemoteProcessingModule(remotePM) {
    return this.sessions.some(
      (session) =>
        session.remotePMs.has(remotePM.nodeId) &&
        session.remotePMs.get(remotePM.nodeId).some((pm) => pm.id === remotePM.id)
    );
  }
}

SessionManager.CONSTANTS = Object.freeze({
  TIMEOUT_START_SESSION: 15000
});

module.exports = { SessionManager };
