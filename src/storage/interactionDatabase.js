const fs = require('fs');
const shelljs = require('shelljs');

const {ProtobufTranslator, MSG_TYPES} = require('@tum-far/ubii-msg-formats');

const {Interaction} = require('@tum-far/ubii-interactions');

class InteractionDatabase {
  constructor() {
    this.directory = process.env['HOME'] + '/.opt/ubii/db/interactions';
    if (!fs.existsSync(this.directory)) {
      shelljs.mkdir('-p', this.directory);
    }

    this.interactions = [];
    this.loadInteractionFiles();
    console.info('########## new InteractionDatabase');
  }

  loadInteractionFiles() {
    fs.readdir(this.directory, (err, files) => {
      if (err) {
        return console.info('InteractionDatabase - Unable to scan directory: ' + err);
      }

      files.forEach((file) => {
        this.loadInteractionFromFile(this.directory + '/' + file);
      });
    });
  }

  saveInteractionToFile(interaction) {
    let path = this.directory + '/' + interaction.name + '.interaction';
    let specs = interaction.toProtobuf();
    if (this.verifySpecification(specs)) {
      fs.writeFile(path, JSON.stringify(specs, null, 4), {flag: 'wx'}, (err) => {
        if (err) throw err;
      });
    }
  }

  loadInteractionFromFile(path) {
    fs.readFile(path, (err, data) => {
      if (err) throw err;

      let specs = JSON.parse(data);

      if (this.interactions.some((interaction) => {
          return interaction.id === specs.id;
        })) {
        console.info('InteractionDatabase - interaction from file ' + path + ' has conflicting ID ' + specs.id);
      } else {
        let interaction = new Interaction(specs);
        this.interactions.push(interaction);
      }
    });
  }

  verifySpecification(specs) {
    let translator = new ProtobufTranslator(MSG_TYPES.INTERACTION);
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

module.exports = new InteractionDatabase();
