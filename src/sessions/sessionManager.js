const EventEmitter = require('events');

const { DEFAULT_TOPICS, MSG_TYPES, proto } = require('@tum-far/ubii-msg-formats');
const namida = require('@tum-far/namida');

const { Session } = require('./session.js');
const { EVENTS_SESSION_MANAGER } = require('./constants');
const Utils = require('../utilities');

let _instance = null;
const SINGLETON_ENFORCER = Symbol();

class SessionManager extends EventEmitter {
  constructor(enforcer) {
    if (enforcer !== SINGLETON_ENFORCER) {
      throw new Error('Use ' + this.constructor.name + '.instance');
    }

    super();

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
  }

  createSession(specs = {}) {
    if (specs.id && this.getSession(specs.id)) {
      namida.logFailure('SessionManager', 'Session ID already exists: ' + specs.id);
      throw new Errror('Session with ID ' + specs.id + ' already exists.');
    }

    if (!specs.ioMappings || specs.ioMappings.length === 0) {
      namida.warn(
        'SessionManager',
        'Session ' + specs.id + ' has no I/O Mappings (topics <-> processing modules)'
      );
    }

    let session = new Session(
      specs,
      this.masterNodeID,
      this.topicData,
      this.processingModuleManager
    );
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
            JSON.stringify(pmList)
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
    let success = session && session.start();
    if (success) {
      this.emit(EVENTS_SESSION_MANAGER.START_SESSION, session.toProtobuf());
      namida.logSuccess('SessionManager', 'succesfully started ' + session.toString());
    } else {
      namida.logFailure('SessionManager', 'failed to start ' + session.toString());
    }

    return success;
  }

  startAllSessions() {
    for (let i = 0; i < this.sessions.length; i++) {
      this.startSession(this.sessions[i]);
    }
  }

  stopSessionByID(id) {
    let session = this.getSession(id);

    return session && this.stopSession(session);
  }

  stopSession(session) {
    let success = session && session.stop();
    if (success) {
      this.emit(EVENTS_SESSION_MANAGER.STOP_SESSION, session.toProtobuf());
      namida.logSuccess('SessionManager', 'succesfully stopped ' + session.toString());
    } else {
      namida.logFailure('SessionManager', 'failed to stop ' + session.toString());
    }

    return success;
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
    this.topicData.publish(
      DEFAULT_TOPICS.INFO_TOPICS.NEW_SESSION,
      sessionSpecs,
      Utils.getTopicDataTypeFromMessageFormat(MSG_TYPES.SESSION)
    );
  }

  onEventSessionChange(sessionSpecs) {
    this.topicData.publish(
      DEFAULT_TOPICS.INFO_TOPICS.CHANGE_SESSION,
      sessionSpecs,
      Utils.getTopicDataTypeFromMessageFormat(MSG_TYPES.SESSION)
    );
  }

  onEventSessionDelete(sessionSpecs) {
    this.topicData.publish(
      DEFAULT_TOPICS.INFO_TOPICS.DELETE_SESSION,
      sessionSpecs,
      Utils.getTopicDataTypeFromMessageFormat(MSG_TYPES.SESSION)
    );
  }

  onEventSessionStart(sessionSpecs) {
    this.topicData.publish(
      DEFAULT_TOPICS.INFO_TOPICS.START_SESSION,
      sessionSpecs,
      Utils.getTopicDataTypeFromMessageFormat(MSG_TYPES.SESSION)
    );
  }

  onEventSessionStop(sessionSpecs) {
    this.topicData.publish(
      DEFAULT_TOPICS.INFO_TOPICS.STOP_SESSION,
      { id: sessionSpecs.id },
      Utils.getTopicDataTypeFromMessageFormat(MSG_TYPES.SESSION)
    );
  }

  verifyRemoteProcessingModule(remotePM) {
    return this.sessions.some(
      (session) =>
        session.remotePMs.has(remotePM.nodeId) &&
        session.remotePMs.get(remotePM.nodeId).some((pm) => pm.id === remotePM.id)
    );
  }
}

module.exports = { SessionManager };
