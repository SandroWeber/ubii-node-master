const fs = require('fs');
const shelljs = require('shelljs');
const uuidv4 = require('uuid/v4');
const { BASE_FOLDER_LOCAL_DB, BASE_FOLDER_ONLINE_DB } = require('./storageConstants');

class Storage {
  constructor(subFolder, fileEnding) {
    this.fileEnding = fileEnding;
    this.subFolder = subFolder;
    this.localDirectory = BASE_FOLDER_LOCAL_DB + '/' + this.subFolder;

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
   * Returns whether a specification with the specified ID exists.
   * @param {String} id
   * @returns {Boolean} Does a specification with the specified ID exists?
   */
  hasSpecification(specs) {
    return this.specificationsLocal.has(specs.id) || this.specificationsOnline.has(specs.id);
  }

  /**
   * Get the specification with the specified id.
   * @param {String} id
   * @returns The specification with the specified id.
   */
  getSpecification(id) {
    return this.specificationsLocal.get(id) || this.specificationsOnline.get(id);
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
   * @param {Object} specification The specification in protobuf format. It requires a name and id property.
   */
  addSpecification(specification) {
    // assign ID, only server does this i.e. IDs sent by clients are ignored and replaced
    specification.id = uuidv4();
    while (this.hasSpecification(specification)) {
      specification.id = uuidv4();
    }

    if (this.hasSpecification(specification)) {
      throw 'Specification with ID ' + specification.id + ' could not be added, ID already exists.';
    }

    try {
      this.specificationsLocal.set(specification.id, specification);
      this.saveSpecificationToFile(specification);
      return specification;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete the specification with the specified id from the specifications list.
   * @param {String} id
   */
  deleteSpecification(id) {
    try {
      this.specificationsLocal.delete(id);
      this.deleteSpecificationFile(id);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a specification that is already present in the specifications list with a new value.
   * @param {Object} specification The specification requires a name and id property.
   */
  updateSpecification(specification) {
    let localSpecification = this.specificationsLocal.get(specification.id);
    if (typeof localSpecification === 'undefined') {
      throw 'Specification with ID ' + specification.id + ' could not be found';
    }

    try {
      this.specificationsLocal.set(specification.id, specification);
      this.deleteSpecificationFile(specification.id);
      this.saveSpecificationToFile(specification);
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
        //console.info('new ', this.fileEnding, ' db local file:');
        //console.log(file);
        this.loadSpecificationFromFile(this.localDirectory + '/' + file);
      });
    });
  }

  loadOnlineDB() {
    let dirOnlineDB = BASE_FOLDER_ONLINE_DB + '/' + this.subFolder;
    fs.readdir(dirOnlineDB, (err, files) => {
      if (err) {
        return console.warn('Storage - Unable to scan directory: ' + err);
      }

      files.forEach(async (file) => {
        let path = dirOnlineDB + '/' + file;
        let specs = await this.getSpecificationFromFile(path);
        if (this.specificationsLocal.has(specs.id) || this.specificationsOnline.has(specs.id)) {
          console.info(
            'Storage - specification from file ' + path + ' has conflicting ID ' + specs.id
          );
        } else {
          this.specificationsOnline.set(specs.id, specs);
          this.filePaths.set(specs.id, path);
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
    if (this.specificationsLocal.has(specs.id) || this.specificationsOnline.has(specs.id)) {
      console.info('Storage - specification from file ' + path + ' has conflicting ID ' + specs.id);
    } else {
      this.specificationsLocal.set(specs.id, specs);
      this.filePaths.set(specs.id, path);
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
   * @param {Object} specification The specification requires a name and id property.
   */
  saveSpecificationToFile(specification) {
    // Build complete path.
    let path = this.localDirectory + '/';
    if (specification.name && specification.name.length > 0) {
      path += specification.name + '_';
    }
    path += specification.id + '.' + this.fileEnding;

    // Write to file and store path.
    try {
      fs.writeFileSync(path, JSON.stringify(specification, null, 4), { flag: 'wx' });
      this.filePaths.set(specification.id, path);
    } catch (error) {
      if (error) throw error;
    }
  }

  /**
   * Replaces a specification file with the path stored with regard to the is of the specification with a new specification file.
   * @param {Object} specification The specification requires a name and id property.
   */
  replaceSpecificationFile(specification) {
    try {
      fs.writeFileSync(
        this.filePaths.get(specification.id),
        JSON.stringify(specification, null, 4),
        { flag: 'w' }
      );
    } catch (error) {
      if (error) throw error;
    }
  }

  /**
   * Deletes the file associated with the specified id.
   * @param {String} id Id of a stored specification.
   */
  deleteSpecificationFile(id) {
    let path = this.filePaths.get(id);
    if (typeof path !== 'undefined') {
      fs.unlinkSync(path);
    }
  }

  async copySpecsFromFile(path) {
    let specs = await this.getSpecificationFromFile(path);
    while (this.hasSpecification(specs)) {
      specs.id = uuidv4();
    }
    specs.name += '_copy';
    this.addSpecification(specs);
  }
}

module.exports = Storage;
