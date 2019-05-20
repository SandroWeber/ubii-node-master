const {Interaction} = require('../sessions/interaction');
const {ProtobufTranslator, MSG_TYPES} = require('@tum-far/ubii-msg-formats');
const Storage = require('./storage.js');

class InteractionDatabase extends Storage{
  constructor() {
    super('interactions', 'interaction');
  }

  /**
   * Get the interaction with the specified id.
   * @param {String} id 
   */
  getInteraction(id) {
    return this.getSpecification(id);
  }

  /**
   * Get an array of all specifications.
   */
  getInteractionList() {
    return this.getSpecificationList();
  }

  /**
   * Add a new interaction protobuf specification based on the specified specification to the specifications list. Returns the corresponding interaction.
   * @param {Object} specification The specification in protobuf format. It requires a name and id property.
   * @returns Returns an interaction that corresponds to the specified specification.
   */
  addInteraction(specification) {
    if (!this.verifySpecification(specification)) {
      throw 'Interaction with ID ' + specification.id + ' could not be registered, invalid specs'
    }

    try {
      let interaction = new Interaction(specification);
      let interactionSpecification = interaction.toProtobuf();

      this.addSpecification(interactionSpecification);

      return interaction;
    } catch (error) {
      throw error;
    }
  }

  deleteInteraction(id) {
    this.deleteSpecification(id);
  }

  updateInteractionSpecs(specification) {
    if (!this.verifySpecification(specification)) {
      throw 'interaction specification could not be verified';
    }

    this.updateSpecification(specification);
  }

  verifySpecification(specification) {
    let translator = new ProtobufTranslator(MSG_TYPES.INTERACTION);
    let result = false;
    try {
      result = translator.verify(specification);
    }
    catch (error) {
      result = false;
    }

    return result;
  }
}

module.exports = new InteractionDatabase();
