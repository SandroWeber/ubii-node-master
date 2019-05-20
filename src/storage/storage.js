const fs = require('fs');
const shelljs = require('shelljs');

const {ProtobufTranslator, MSG_TYPES} = require('@tum-far/ubii-msg-formats');

const {BASE_FOLDER_DB} = require('./storageConstants');


class Storage {
  constructor(subFolder, fileEnding) {
    this.subFolder = subFolder;
    this.directory = BASE_FOLDER_DB + '/' + this.subFolder;
    if (!fs.existsSync(this.directory)) {
      shelljs.mkdir('-p', this.directory);
    }

    this.specifications = new Map();
    this.filePaths = new Map();

    this.loadAllSpecificationFiles();
  }

  getSpecification(id) { //
    return this.specifications.get(id);
  }

  getSpecificationList() { //
    return Array.from(this.specifications.values());
  }

  addSpecification(specification) { // fr[her register]
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

  deleteSpecification(id) { //
    try {
      this.specifications.delete(id);
      this.deleteSpecificationFile(id);
    } catch (error) {
      throw error;
    }
  }

  updateSpecification(specification) {//
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
   * @param {Object} specs The specification requires a name and id property.
   */
  saveSpecificationToFile(specs) {
    // Build complete path.
    let path = this.directory + '/';
    if (specs.name && specs.name.length > 0) {
      path += specs.name + '_';
    }
    path += specs.id + '.'+this.fileEnding;

    // Write to file and store path.
    try {
      fs.writeFileSync(path, JSON.stringify(specs, null, 4), {flag: 'wx'});
      this.filePaths.set(specs.id, path);
    } catch (error) {
      if (error) throw error;
    }
  }

  /**
   * Replaces a specification file with the path stored with regard to the is of the specification with a new specification file.
   * @param {Object} specs The specification requires a name and id property.
   */
  replaceSpecificationFile(specs) {
    try {
      fs.writeFileSync(this.filePaths.get(specs.id), JSON.stringify(specs, null, 4), {flag: 'w'});
    } catch (error) {
      if (error) throw error;
    }
  }

  deleteSpecificationFile(id) {
    let path = this.filePaths.get(id);
    if (typeof path !== 'undefined') {
      fs.unlinkSync(path);
    }
  }
}

module.exports = Storage;