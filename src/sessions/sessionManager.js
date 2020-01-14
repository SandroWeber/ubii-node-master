const EventEmitter = require('events');

const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Session } = require('./session.js');
const { EVENTS_SESSION_MANAGER } = require('./constants');
const Utils = require('../utilities');

class SessionManager extends EventEmitter {
  constructor(topicData, deviceManager) {
    super();

    this.topicData = topicData;
    this.deviceManager = deviceManager;
    this.sessions = [];

    this.addEventListeners();
  }

  createSession(specifications = {}) {
    if (specifications.id && this.getSession(specifications.id)) {
      throw 'Session with ID ' + specifications.id + ' already exists.';
    }

    let session = new Session(specifications, this.topicData, this.deviceManager);
    this.addSession(session);
    this.emit(EVENTS_SESSION_MANAGER.NEW_SESSION, session.toProtobuf());

    return session;
  }

  addSession(session) {
    if (
      this.sessions.some(element => {
        return element.id === session.id;
      })
    ) {
      return;
    }

    if (session instanceof Session) {
      this.sessions.push(session);
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
    return this.sessions.find(session => {
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

    return this.stopSession(session);
  }

  stopSession(session) {
    let success = session && session.stop();
    if (success) {
      this.emit(EVENTS_SESSION_MANAGER.STOP_SESSION, session.toProtobuf());
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
    this.on(EVENTS_SESSION_MANAGER.NEW_SESSION, specs => {
      this.onEventNewSession(specs);
    });

    this.on(EVENTS_SESSION_MANAGER.CHANGE_SESSION, specs => {
      this.onEventSessionChange(specs);
    });

    this.on(EVENTS_SESSION_MANAGER.DELETE_SESSION, specs => {
      this.onEventSessionChange(specs);
    });

    this.on(EVENTS_SESSION_MANAGER.START_SESSION, specs => {
      this.onEventSessionStart(specs);
    });

    this.on(EVENTS_SESSION_MANAGER.STOP_SESSION, specs => {
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
      { id: sessionSpecs.id },
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
}

module.exports = { SessionManager };
