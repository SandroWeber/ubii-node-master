const {ProtobufTranslator, MSG_TYPES} = require('@tum-far/ubii-msg-formats');
const Storage = require('./storage.js');

class InteractionDatabase extends Storage{
  constructor() {
    super('interactions', 'interaction');
  }

  /**
   * Returns whether an interaction specification with the specified ID exists.
   * @param {String} id 
   * @returns {Boolean} Does an interaction specification with the specified ID exists?
   */
  hasInteraction(id) {
    return this.hasSpecification(id);
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
   * Add a new interaction protobuf specification based on the specified specification to the specifications list.
   * @param {Object} specification The specification in protobuf format. It requires a name and id property.
   */
  addInteraction(specification) {
    if (!this.verifySpecification(specification)) {
      throw 'Interaction with ID ' + specification.id + ' could not be registered, invalid specs'
    }

    try {
      return this.addSpecification(specification);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete the interaction specification with the specified id from the specifications list.
   * @param {String} id 
   */
  deleteInteraction(id) {
    this.deleteSpecification(id);
  }

  /**
   * Update a interaction specification that is already present in the specifications list with a new value.
   * @param {Object} specification The specification requires a name and id property.
   */
  updateInteraction(specification) {
    if (!this.verifySpecification(specification)) {
      throw 'interaction specification could not be verified';
    }

    this.updateSpecification(specification);
  }

  /**
   * Verifies the specified specification.
   * @param {*} specification 
   */
  verifySpecification(specification) {
    let translator = new ProtobufTranslator(MSG_TYPES.INTERACTION);
    try {
      return translator.verify(specification);
    }
    catch (error) {
      return false;
    }
  }
}

module.exports = new InteractionDatabase();
