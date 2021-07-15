const { v4: uuidv4 } = require('uuid');

const {Interaction} = require('interaction');

class InteractionIOMapping {
  constructor(id, interaction, mapInputs, mapOutputs) {
    this.id = id ? id : uuidv4();

    this.interaction = interaction ? interaction : new Interaction();
    this.mapInputs = mapInputs ? mapInputs : new Map();
    this.mapOutputs = mapOutputs ? mapOutputs : new Map();
  }

  setInteraction(interaction) {
    this.interaction = interaction;
  }

  setInputMapping(input, topic) {
    this.mapInputs.set(input, topic);
  }

  deleteInputMapping(input) {
    this.mapInputs.delete(input);
  }

  setOutputMapping(output, topic) {
    this.mapInputs.set(output, topic);
  }

  deleteOutputMapping(output) {
    this.mapOutputs.delete(output);
  }
}

module.exports = InteractionIOMapping;