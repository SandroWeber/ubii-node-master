const fs = require('fs');
const path = require('path');
const shelljs = require('shelljs');

const namida = require('@tum-far/namida/src/namida');

const { BASE_FOLDER_LOCAL_DB, BASE_FOLDER_ONLINE_DB } = require('./storageConstants');

class Storage {
  constructor(subFolder, fileEnding) {
    this.fileEnding = fileEnding;
    this.subFolder = subFolder;
    this.localDirectory = BASE_FOLDER_LOCAL_DB + '/' + this.subFolder;
    this.onlineDirectory = BASE_FOLDER_ONLINE_DB + '/' + this.subFolder;

    if (!fs.existsSync(this.localDirectory)) {
      shelljs.mkdir('-p', this.localDirectory);
    }

    this.specificationsLocal = new Map();
    this.specificationsOnline = new Map();
    this.filePaths = new Map();

    this.loadOnlineDB();
    this.loadLocalDB();
  }

  /**
   * Returns whether a specification matching the given specifications exists. Currently only checks for name.
   * @param {Specification Object} specs
   * @returns {boolean} Does a specification with the given specifications exist?
   */
  hasSpecification(specs) {
    return this.specificationsLocal.has(specs.name) || this.specificationsOnline.has(specs.name);
  }

  /**
   * Get the specification with the specified name.
   * @param {string} name
   * @returns The specification with the specified name.
   */
  getSpecification(name) {
    return this.specificationsLocal.get(name) || this.specificationsOnline.get(name);
  }

  /**
   * Get an array of all specifications.
   * @returns Array with all specifications.
   */
  getLocalSpecificationList() {
    return Array.from(this.specificationsLocal.values());
  }

  getOnlineSpecificationList() {
    return Array.from(this.specificationsOnline.values());
  }

  /**
   * Add a new specification to the specifications list.
   * @param {object} spec - The specification. It requires a name property.
   */
  addSpecification(spec) {
    while (this.hasSpecification(spec)) {
      spec.name = spec.name + '_new';
    }

    if (this.hasSpecification(spec)) {
      throw 'Specification with name ' + spec.name + ' could not be added, name already exists.';
    }

    try {
      this.specificationsLocal.set(spec.name, spec);
      this.saveSpecificationToFile(spec);
      return spec;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete the specification with the specified name from the specifications list.
   * @param {String} name
   */
  deleteSpecification(name) {
    try {
      this.specificationsLocal.delete(name);
      this.deleteSpecificationFile(name);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a specification that is already present in the specifications list with a new value.
   * @param {Object} spec The specification requires a name property.
   */
  updateSpecification(spec) {
    let localSpecification = this.specificationsLocal.get(spec.name);
    if (typeof localSpecification === 'undefined') {
      throw 'Specification with name ' + spec.name + ' could not be found';
    }

    try {
      this.specificationsLocal.set(spec.name, spec);
      this.deleteSpecificationFile(spec.name);
      this.saveSpecificationToFile(spec);
    } catch (error) {
      throw error;
    }
  }

  // Storage file utility methods:

  /**
   * Load all specification files that are present in the sub-folder specified for this storage.
   */
  loadLocalDB() {
    let files = fs.readdirSync(this.localDirectory);
    files.forEach((file) => {
      if (path.extname(file) === '.' + this.fileEnding) {
        this.loadSpecificationFromFile(this.localDirectory + '/' + file);
      }
    });
  }

  loadOnlineDB() {
    fs.readdir(this.onlineDirectory, (err, files) => {
      if (err) {
        namida.log(this.toString(), 'Unable to scan directory: ' + err);
        return;
      }

      files.forEach(async (file) => {
        let path = dirOnlineDB + '/' + file;
        let specs = await this.getSpecificationFromFile(path);
        if (!this.isValidSpecName(specs.name)) {
          namida.logFailure(
            this.toString(),
            'specification from file ' + path + ' has conflicting name "' + specs.name + '"'
          );
        } else {
          this.specificationsOnline.set(specs.name, specs);
          this.filePaths.set(specs.name, path);
        }
      });
    });
  }

  /**
   * Load a specification from the file with the specified path and adds it to the local specifications.
   * @param {string} path - Path to the specification file.
   */
  loadSpecificationFromFile(path) {
    let specs = this.getSpecificationFromFile(path);
    if (!this.isValidSpecName(specs.name)) {
      namida.logFailure(
        this.toString(),
        'specification from file ' + path + ' has conflicting name ' + specs.name
      );
    } else {
      this.specificationsLocal.set(specs.name, specs);
      this.filePaths.set(specs.name, path);
    }
  }

  /**
   * Returns the parsed JSON content.
   * @param {string} path - Path to file.
   * @returns {object} - The parsed JSON object.
   */
  getSpecificationFromFile(path) {
    let file = fs.readFileSync(path);
    let specs = JSON.parse(file);
    return specs;
  }

  /**
   * Saves a specification to a file with the corresponding path. The path is then stored in the filePaths map.
   * @param {object} spec - The specification requires a name property.
   */
  saveSpecificationToFile(spec) {
    if (!spec.name) {
      namida.logFailure(this.toString(), 'could not save specs to file, no name given');
      return;
    }
    // Build complete path.
    let path = this.localDirectory + '/' + spec.name + this.fileEnding;

    // Write to file and store path.
    try {
      fs.writeFileSync(path, JSON.stringify(spec, null, 4), { flag: 'wx' });
      this.filePaths.set(spec.name, path);
    } catch (error) {
      if (error) throw error;
    }
  }

  /**
   * Replaces a specification file with the path stored with regard to the is of the specification with a new specification file.
   * @param {object} specification - The specification requires a name property.
   */
  replaceSpecificationFile(specification) {
    try {
      fs.writeFileSync(
        this.filePaths.get(specification.name),
        JSON.stringify(specification, null, 4),
        { flag: 'w' }
      );
    } catch (error) {
      if (error) throw error;
    }
  }

  /**
   * Deletes the file associated with the specified name.
   * @param {string} name - Name of a stored specification.
   */
  deleteSpecificationFile(name) {
    let path = this.filePaths.get(name);
    if (typeof path !== 'undefined') {
      fs.unlinkSync(path);
    }
  }

  async copySpecsFromFile(path) {
    let specs = await this.getSpecificationFromFile(path);
    while (this.hasSpecification(specs)) {
      specs.name = specs.name + '_copy';
    }
    this.addSpecification(specs);
  }

  /**
   * Checks whether the passed object has a valid name specified.
   * @param {string} name - Specification object to test
   */
  isValidSpecName(name) {
    return name && name.length > 0 && !this.hasSpecification({ name: name });
  }

  toString() {
    return 'Storage(.' + this.fileEnding + ')';
  }
}

module.exports = Storage;
