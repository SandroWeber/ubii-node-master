const {Session} = require('./session.js');
const SessionDatabase = require('../storage/sessionDatabase');

class SessionManager {
  constructor(topicData) {
    this.topicData = topicData;
    this.sessions = [];
  }

  createSession(specifications = {}) {
    if (specifications.id && (this.getSession(specifications.id) || SessionDatabase.getSession(specifications.id))) {
      throw 'Session with ID ' + specifications.id + ' already exists.';
    }

    let session = new Session(specifications, this.topicData);
    this.addSession(session);

    return session;
  }

  addSession(session) {
    if (this.sessions.some((element) => {
        return element.id === session.id;
      })) {
      return;
    }

    if (session instanceof Session) {
      this.sessions.push(session);
    }
  }

  removeSession(id) {
    for (let i = 0; i < this.sessions.length; i++) {
      if (this.sessions[i].id === id) {
        this.sessions.splice(i, 1);
        break;
      }
    }
  }

  getSession(id) {
    return this.sessions.find((session) => {return session.id === id;});
  }

  getSessionList() {
    return this.sessions;
  }

  startSession(id) {
    let session = this.sessions.find((session) => {return session.id === id;});
    if (session) {
      session.start();
      return true;
    } else {
      return false;
    }
  }

  stopSession(id) {
    let session = this.sessions.find((session) => {return session.id === id;});
    if (session) {
      session.stop();
      return true;
    } else {
      return false;
    }
  }

  startAllSessions() {
    this.sessions.forEach((session) => {
      session.start();
    });
  }

  stopSession(id) {
    this.sessions.forEach((session) => {
      if (session.id === id) {
        session.stop();
      }
    });
  }

  stopAllSessions() {
    this.sessions.forEach((session) => {
      session.stop();
    });
  }
}

module.exports = {SessionManager};