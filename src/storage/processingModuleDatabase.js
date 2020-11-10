const fs = require('fs');
const path = require('path');

const namida = require('@tum-far/namida/src/namida');
const { ProtobufTranslator, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const Storage = require('./storage.js');

class ProcessingModuleDatabase extends Storage {
  constructor() {
    super('processing', 'pm');

    this.loadLocalJsModules();
  }

  /**
   * Returns whether a processing module specification matching the given specifications exists.
   * @param {object} specs
   * @returns {Boolean} Does a processing module specification with the given specifications exist?
   */
  has(specs) {
    return this.hasSpecification(specs);
  }

  /**
   * Get the processing module with the specified name.
   * @param {string} name
   * @returns {(object|constructor)} The JSON object or the constructor of the JS class for the module
   */
  getByName(name) {
    return this.getSpecification(name) || this.localJsPMs.get(name);
  }

  /**
   * Get an array of all specifications.
   */
  getList() {
    return this.getLocalSpecificationList();
  }

  /**
   * Add a new Processing Module specification to the list.
   * @param {Object} spec The specification in protobuf format. It requires a name property.
   */
  add(spec) {
    if (!this.verifySpecification(spec)) {
      throw 'Processing Module with name ' + spec.name + ' could not be registered, invalid specs';
    }

    try {
      return this.addSpecification(spec);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete the processing module with the specified name from the specifications list.
   * @param {String} name
   */
  deleteByName(name) {
    this.deleteSpecification(name);
  }

  /**
   * Update a processing module specification that is already present in the specifications list with a new value.
   * @param {Object} spec The specification requires a name property.
   */
  update(spec) {
    if (!this.verifySpecification(spec)) {
      throw 'Processing Module specification could not be verified';
    }

    this.updateSpecification(spec);
  }

  /**
   * Verifies the specified specification.
   * @param {object} spec - The object to verify.
   */
  verify(spec) {
    let translator = new ProtobufTranslator(MSG_TYPES.PM);
    try {
      return translator.verify(spec);
    } catch (error) {
      return false;
    }
  }

  /**
   * Load all js files defining natively written modules that are present in the sub-folder specified for this storage.
   */
  loadLocalJsModules() {
    this.localJsPMs = new Map();

    let files = fs.readdirSync(this.localDirectory);
    files.forEach((file) => {
      if (path.extname(file) === '.js') {
        let filepath = this.localDirectory + '/' + file;
        this.loadJSModule(filepath, this.localJsPMs);
      }
    });
  }

  /**
   * Load processing module written in .js.
   * @param {string} filepath - path to file
   * @param {Map} map - map to add the the loaded module to
   */
  loadJSModule(filepath, map) {
    let pmClass = require(filepath);
    let pm = new pmClass();

    if (!this.isValidSpecName(pm.name)) {
      namida.logFailure(
        this.toString(),
        'specification from file ' + filepath + ' has conflicting name "' + pm.name + '"'
      );
    } else {
      map.set(pm.name, pmClass);
      this.filePaths.set(pm.name, filepath);
    }
  }

  /**
   * Overrides Storage.isValidSpecName() to include processing modules natively written in JS.
   * @param {string} name - The object to check for viable naming.
   */
  isValidSpecName(name) {
    return (
      name &&
      name.length > 0 &&
      !this.hasSpecification({ name: name }) &&
      !this.localJsPMs.has(name)
    );
  }
}

module.exports = new ProcessingModuleDatabase();
