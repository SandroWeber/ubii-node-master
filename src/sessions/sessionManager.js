const {Session} = require('./session.js');

class SessionManager {
  constructor(topicData) {
    this.topicData = topicData;
    this.sessions = [];
  }

  createSession(specifications) {
    let session = new Session(specifications || {}, this.topicData);
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