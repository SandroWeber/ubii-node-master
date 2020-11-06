const fs = require('fs');
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
   * Returns whether a specification matching the given specifications exists.
   * @param {Specification Object} specs
   * @returns {Boolean} Does a specification with the given specifications exist?
   */
  hasSpecification(specs) {
    return this.specificationsLocal.has(specs.name) || this.specificationsOnline.has(specs.name);
  }

  /**
   * Get the specification with the specified name.
   * @param {String} name
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
   * @param {Object} spec The specification in protobuf format. It requires a name property.
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
    fs.readdir(this.localDirectory, (err, files) => {
      if (err) {
        return console.info('Storage - Unable to scan directory: ' + err);
      }

      files.forEach((file) => {
        let fileEndingIndex = file.lastIndexOf('.');
        let fileEnding = file.substr(fileEndingIndex + 1);

        if (fileEnding === this.fileEnding) {
          this.loadSpecificationFromFile(this.localDirectory + '/' + file);
        }
      });
    });
  }

  loadOnlineDB() {
    fs.readdir(this.onlineDirectory, (err, files) => {
      if (err) {
        return console.warn('Storage - Unable to scan directory: ' + err);
      }

      files.forEach(async (file) => {
        let path = dirOnlineDB + '/' + file;
        let specs = await this.getSpecificationFromFile(path);
        if (this.specificationsLocal.has(specs.name) || this.specificationsOnline.has(specs.name)) {
          namida.logFailure(
            this.fileEnding + ' Storage',
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
   * @param {String} path Path to the specification file.
   */
  async loadSpecificationFromFile(path) {
    let specs = await this.getSpecificationFromFile(path);
    if (
      this.specificationsLocal.has(specs.name) ||
      this.specificationsOnline.has(specs.name) ||
      specs.name === ''
    ) {
      namida.logFailure(
        this.fileEnding + ' Storage',
        'specification from file ' + path + ' has conflicting name ' + specs.name
      );
    } else {
      this.specificationsLocal.set(specs.name, specs);
      this.filePaths.set(specs.name, path);
      console.info('new db local file: ' + path);
      console.info(this.specificationsLocal);
    }
  }

  getSpecificationFromFile(path) {
    return new Promise((resolve, reject) => {
      fs.readFile(path, (err, data) => {
        if (err) {
          reject(err);
          throw err;
        }

        let specs = JSON.parse(data);
        return resolve(specs);
      });
    });
  }

  /**
   * Saves a specification to a file with the corresponding path. The path is then stored in the filePaths map.
   * @param {Object} specification The specification requires a name property.
   */
  saveSpecificationToFile(specification) {
    if (!specification.name) {
      namida.logFailure(
        this.fileEnding + ' Storage',
        'could not save specs to file, no name given'
      );
      return;
    }
    // Build complete path.
    let path = this.localDirectory + '/' + specification.name + this.fileEnding;

    // Write to file and store path.
    try {
      fs.writeFileSync(path, JSON.stringify(specification, null, 4), { flag: 'wx' });
      this.filePaths.set(specification.name, path);
    } catch (error) {
      if (error) throw error;
    }
  }

  /**
   * Replaces a specification file with the path stored with regard to the is of the specification with a new specification file.
   * @param {Object} specification The specification requires a name property.
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
   * @param {String} name Name of a stored specification.
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
}

module.exports = Storage;
