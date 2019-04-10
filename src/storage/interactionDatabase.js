const fs = require('fs');
const shelljs = require('shelljs');

const {ProtobufTranslator, MSG_TYPES} = require('@tum-far/ubii-msg-formats');

const {Interaction} = require('../sessions/interaction');

class InteractionDatabase {
  constructor() {
    this.directory = process.env['HOME'] + '/.opt/ubii/db/interactions';
    if (!fs.existsSync(this.directory)) {
      shelljs.mkdir('-p', this.directory);
    }

    this.interactions = new Map();
    this.interactionFilepaths = new Map();

    this.loadInteractionFiles();
  }

  getInteraction(id) {
    return this.interactions.get(id);
  }

  getInteractionList() {
    return Array.from(this.interactions.values());
  }

  registerInteraction(specs) {
    if (this.interactions.has(specs.id)) {
      throw 'Interaction with ID ' + specs.id + ' could not be registered, ID already exists'
    }

    if (!this.verifySpecification(specs)) {
      throw 'Interaction with ID ' + specs.id + ' could not be registered, invalid specs'
    }

    let interaction = new Interaction(specs);
    this.interactions.set(interaction.id, interaction);
    this.saveInteractionToFile(interaction);

    return interaction;
  }

  deleteInteraction(id) {
    try {
      this.interactions.delete(id);
      this.deleteInteractionFile(id);
    } catch (error) {
      throw error;
    }
  }

  updateInteraction(specs) {
    if (!this.verifySpecification(specs)) {
      throw 'interaction specification could not be verified';
    }

    let interaction = this.interactions.get(specs.id);
    if (typeof interaction === 'undefined') {
      throw 'interaction with ID ' + specs.id + ' could not be found';
    }

    let interaction = new Interaction(specs);
    this.interactions.set(specs.id, interaction);
    this.deleteInteractionFile(specs.id);
    this.saveInteractionToFile(interaction);
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

  loadInteractionFromFile(path) {
    fs.readFile(path, (err, data) => {
      if (err) throw err;

      let specs = JSON.parse(data);

      if (this.interactions.has(specs.id)) {
        console.info('InteractionDatabase - interaction from file ' + path + ' has conflicting ID ' + specs.id);
      } else {
        let interaction = new Interaction(specs);
        this.interactions.set(interaction.id, interaction);
        this.interactionFilepaths.set(interaction.id, path);
      }
    });
  }

  saveInteractionToFile(interaction) {
    let path;
    if (interaction.name !== '') {
      path = this.directory + '/' + interaction.name + '.interaction';
    } else {
      path = this.directory + '/' + interaction.id + '.interaction';
    }

    let specs = interaction.toProtobuf();
    if (this.verifySpecification(specs)) {
      fs.writeFile(path, JSON.stringify(specs, null, 4), {flag: 'wx'}, (err) => {
        if (err) throw err;
      });
    }
  }

  deleteInteractionFile(id) {
    let path = this.interactionFilepaths.get(id);
    if (typeof path !== 'undefined') {
      fs.unlinkSync(path, (err) => {
        if (err) throw err;
        console.info('interaction at ' + path + ' deleted');
      });
    }
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
