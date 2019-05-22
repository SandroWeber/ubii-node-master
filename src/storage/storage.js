const fs = require('fs');
const shelljs = require('shelljs');
const {BASE_FOLDER_DB} = require('./storageConstants');

class Storage {
  constructor(subFolder, fileEnding) {
    this.fileEnding = fileEnding;
    this.subFolder = subFolder;
    this.directory = BASE_FOLDER_DB + '/' + this.subFolder;
    if (!fs.existsSync(this.directory)) {
      shelljs.mkdir('-p', this.directory);
    }

    this.specifications = new Map();
    this.filePaths = new Map();

    this.loadAllSpecificationFiles();
  }

  hasSpecification(id) {
    return this.specifications.has(id);
  }

  /**
   * Get the specification with the specified id.
   * @param {String} id 
   */
  getSpecification(id) {
    return this.specifications.get(id);
  }

  /**
   * Get an array of all specifications.
   */
  getSpecificationList() {
    return Array.from(this.specifications.values());
  }

  /**
   * Add a new specification to the specifications list.
   * @param {Object} specification The specification in protobuf format. It requires a name and id property.
   */
  addSpecification(specification) {
    if (this.specifications.has(specification.id)) {
      throw 'Specification with ID ' + specification.id + ' could not be added, ID already exists.'
    }

    try {
      this.specifications.set(specification.id, specification);
      this.saveSpecificationToFile(specification);
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
      this.specifications.delete(id);
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
    let localSpecification = this.specifications.get(specification.id);
    if (typeof localSpecification === 'undefined') {
      throw 'Specification with ID ' + specification.id + ' could not be found';
    }

    try {
      this.specifications.set(specification.id, specification);
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
  loadAllSpecificationFiles() {
    fs.readdir(this.directory, (err, files) => {
      if (err) {
        return console.info('Storage - Unable to scan directory: ' + err);
      }

      files.forEach((file) => {
        this.loadSpecificationFromFile(this.directory + '/' + file);
      });
    });
  }

  /**
   * Load a specification from the file with the specified path and adds it to the local specifications.
   * @param {String} path Path to the specification file.
   */
  loadSpecificationFromFile(path) {
    fs.readFile(path, (err, data) => {
      if (err) throw err;

      let specs = JSON.parse(data);

      if (this.specifications.has(specs.id)) {
        console.info('Storage - specification from file ' + path + ' has conflicting ID ' + specs.id);
      } else {
        this.specifications.set(specs.id, specs);
        this.filePaths.set(specs.id, path);
      }
    });
  }

  /**
   * Saves a specification to a file with the corresponding path. The path is then stored in the filePaths map.
   * @param {Object} specification The specification requires a name and id property.
   */
  saveSpecificationToFile(specification) {
    // Build complete path.
    let path = this.directory + '/';
    if (specification.name && specification.name.length > 0) {
      path += specification.name + '_';
    }
    path += specification.id + '.'+this.fileEnding;

    // Write to file and store path.
    try {
      fs.writeFileSync(path, JSON.stringify(specification, null, 4), {flag: 'wx'});
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
      fs.writeFileSync(this.filePaths.get(specification.id), JSON.stringify(specification, null, 4), {flag: 'w'});
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
}

module.exports = Storage;