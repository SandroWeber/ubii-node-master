const fs = require('fs');
const shelljs = require('shelljs');

const {ProtobufTranslator, MSG_TYPES} = require('@tum-far/ubii-msg-formats');


class SessionDatabase {
  constructor() {
    this.directory = process.env['HOME'] + '/.opt/ubii/db/sessions';
    if (!fs.existsSync(this.directory)){
      shelljs.mkdir('-p', this.directory);
    }

    this.sessionSpecs = new Map();
    this.loadSessionFiles();
  }

  hasSessionSpecsByID(id) {
    return this.sessionSpecs.has(id);
  }

  getSessionSpecsByID(id) {
    return this.sessionSpecs.get(id);
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

  saveSessionSpecsToFile(specs) {
    let path = this.directory + '/';
    if (specs.name && specs.name.length > 0) {
      path += specs.name + '_';
    }
    path += specs.id + '.session';

    if (this.verifySpecification(specs)) {
      fs.writeFile(path, JSON.stringify(specs, null, 4), { flag: 'wx' }, (error) => {
        if (error) {
          console.info('SessionDatabase - session already esists:\n' + error);
          throw error;
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

      if (this.sessionSpecs.has(specs.id)) {
        console.info('InteractionDatabase - interaction from file ' + path + ' has conflicting ID ' + specs.id);
      } else {
        this.sessionSpecs.set(specs.id, specs);
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
