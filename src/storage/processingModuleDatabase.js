const { ProtobufTranslator, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const Storage = require('./storage.js');

class ProcessingModuleDatabase extends Storage {
  constructor() {
    super('pm', 'pm');
  }

  /**
   * Returns whether an interaction specification with the specified ID exists.
   * @param {String} id
   * @returns {Boolean} Does an interaction specification with the specified ID exists?
   */
  has(specs) {
    return this.hasSpecification(specs);
  }

  /**
   * Get the interaction with the specified id.
   * @param {String} id
   */
  getByID(id) {
    return this.getSpecification(id);
  }

  /**
   * Get an array of all specifications.
   */
  getList() {
    return this.getLocalSpecificationList();
  }

  /**
   * Add a new interaction protobuf specification based on the specified specification to the specifications list.
   * @param {Object} specification The specification in protobuf format. It requires a name and id property.
   */
  add(specification) {
    if (!this.verifySpecification(specification)) {
      throw 'Interaction with ID ' + specification.id + ' could not be registered, invalid specs';
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
  deleteByID(id) {
    this.deleteSpecification(id);
  }

  /**
   * Update a interaction specification that is already present in the specifications list with a new value.
   * @param {Object} specification The specification requires a name and id property.
   */
  update(specification) {
    if (!this.verifySpecification(specification)) {
      throw 'interaction specification could not be verified';
    }

    this.updateSpecification(specification);
  }

  /**
   * Verifies the specified specification.
   * @param {*} specification
   */
  verify(specification) {
    let translator = new ProtobufTranslator(MSG_TYPES.INTERACTION);
    try {
      return translator.verify(specification);
    } catch (error) {
      return false;
    }
  }
}

module.exports = new ProcessingModuleDatabase();
