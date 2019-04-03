const fs = require('fs');
const shelljs = require('shelljs');

const {ProtobufTranslator, MSG_TYPES} = require('@tum-far/ubii-msg-formats');

const {Session} = require('../sessions/session');

class SessionDatabase {
  constructor() {
    this.directory = process.env['HOME'] + '/.opt/ubii/db/sessions';
    if (!fs.existsSync(this.directory)){
      shelljs.mkdir('-p', this.directory);
    }

    this.sessions = [];
    this.loadSessionFiles();
  }

  loadSessionFiles() {
    fs.readdir(this.directory, (err, files) => {
      if (err) {
        return console.info('SessionDatabase - Unable to scan directory: ' + err);
      }

      files.forEach((file) => {
        this.loadSessionFromFile(this.directory + '/' + file);
      });
    });
  }

  saveSessionToFile(session) {
    let path = this.directory + '/' + session.name + '.session';

    let specs = session.toProtobuf();
    if (this.verifySpecification(specs)) {
      fs.writeFile(path, JSON.stringify(specs, null, 4), { flag: 'wx' }, (err) => {
        if (err) {
          console.info('SessionDatabase - session already esists:\n' + err);
        }
      });
    }
  }

  loadSessionFromFile(path) {
    fs.readFile(path, (err, data) => {
      if (err) throw err;

      let specs = JSON.parse(data);

      if (!this.verifySpecification(specs)) {
        console.info('InteractionDatabase - invalid specifications:\n' + specs);
      }

      if (this.sessions.some((session) => {return session.id === specs.id;})) {
        console.info('InteractionDatabase - interaction from file ' + path + ' has conflicting ID ' + specs.id);
      } else {
        let session = new Session(specs);
        this.sessions.push(session);
      }
    });
  }

  verifySpecification(specs) {
    let translator = new ProtobufTranslator(MSG_TYPES.SESSION);
    let result = false;
    try {
      result = translator.verify(specs);
    }
    catch (error) {
      result = false;
    }

    return result;
  }
}

module.exports = new SessionDatabase();
