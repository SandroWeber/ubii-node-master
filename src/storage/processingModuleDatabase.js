const { ProtobufTranslator, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const Storage = require('./storage.js');

class ProcessingModuleDatabase extends Storage {
  constructor() {
    super('pm', 'pm');
  }

  /**
   * Returns whether an interaction specification matching the given specifications exists.
   * @param {Specification Object} specs
   * @returns {Boolean} Does an interaction specification with the given specifications exist?
   */
  has(specs) {
    return this.hasSpecification(specs);
  }

  /**
   * Get the interaction with the specified name.
   * @param {String} name
   */
  getByName(name) {
    return this.getSpecification(name);
  }

  /**
   * Get an array of all specifications.
   */
  getList() {
    return this.getLocalSpecificationList();
  }

  /**
   * Add a new interaction protobuf specification based on the specified specification to the specifications list.
   * @param {Object} spec The specification in protobuf format. It requires a name property.
   */
  add(spec) {
    if (!this.verifySpecification(spec)) {
      throw 'Interaction with name ' + spec.name + ' could not be registered, invalid specs';
    }

    try {
      return this.addSpecification(spec);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete the interaction specification with the specified name from the specifications list.
   * @param {String} name
   */
  deleteByName(name) {
    this.deleteSpecification(name);
  }

  /**
   * Update a interaction specification that is already present in the specifications list with a new value.
   * @param {Object} spec The specification requires a name property.
   */
  update(spec) {
    if (!this.verifySpecification(spec)) {
      throw 'interaction specification could not be verified';
    }

    this.updateSpecification(spec);
  }

  /**
   * Verifies the specified specification.
   * @param {*} spec
   */
  verify(spec) {
    let translator = new ProtobufTranslator(MSG_TYPES.INTERACTION);
    try {
      return translator.verify(spec);
    } catch (error) {
      return false;
    }
  }
}

module.exports = new ProcessingModuleDatabase();
