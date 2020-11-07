const fs = require('fs');

const namida = require('@tum-far/namida/src/namida');
const { ProtobufTranslator, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const Storage = require('./storage.js');

class ProcessingModuleDatabase extends Storage {
  constructor() {
    super('processing', 'pm');

    this.loadLocalNativeJsModules();
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
    return this.getSpecification(name) || this.localNativeJsPMs.get(name);
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
  loadLocalNativeJsModules() {
    this.localNativeJsPMs = new Map();

    fs.readdir(this.localDirectory, (err, files) => {
      if (err) {
        namida.log(this.toString(), 'Unable to scan directory: ' + err);
        return;
      }

      files.forEach((file) => {
        let fileEndingIndex = file.lastIndexOf('.');
        let fileEnding = file.substr(fileEndingIndex + 1);

        if (fileEnding === 'js') {
          let filepath = this.localDirectory + '/' + file;
          let pmClass = require(filepath).default;
          let pm = new pmClass();

          if (!this.isValidSpecName(pm)) {
            namida.logFailure(
              this.fileEnding + ' Storage',
              'specification from file ' + filepath + ' has conflicting name "' + pm.name + '"'
            );
          } else {
            this.localNativeJsPMs.set(pm.name, pmClass);
            this.filePaths.set(pm.name, filepath);
          }
        }
      });
    });
  }

  /**
   * Overrides Storage.isValidSpecName() to include processing modules natively written in JS.
   * @param {string} name - The object to check for viable naming.
   */
  isValidSpecName(name) {
    return (
      !this.hasSpecification({ name: name }) && !this.localNativeJsPMs.has(name) && name.length > 0
    );
  }
}

module.exports = new ProcessingModuleDatabase();
