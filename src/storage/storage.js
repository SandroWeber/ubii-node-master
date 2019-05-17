const fs = require('fs');
const shelljs = require('shelljs');

const {ProtobufTranslator, MSG_TYPES} = require('@tum-far/ubii-msg-formats');

const {Interaction} = require('../sessions/interaction');
const {BASE_FOLDER_DB} = require('./storageConstants');


export default class Storage {
  constructor(subfolder) {
    this.subfolder = subfolder;
    this.directory = BASE_FOLDER_DB + '/' + this.subfolder;
    if (!fs.existsSync(this.directory)) {
      shelljs.mkdir('-p', this.directory);
    }

    this.specifications = new Map();
    this.filepaths = new Map();

    this.loadInteractionFiles();
  }

  getSpecification(id) {
    return this.specifications.get(id);
  }

  getSpecificationList() {
    return Array.from(this.specifications.values());
  }

  addSpecification(specification) {
    if (this.specifications.has(specification.id)) {
      throw 'Specification with ID ' + specification.id + ' could not be added, ID already exists.'
    }

    try {
      this.specifications.set(specification.id, specification);
      this.saveInteractionSpecsToFile(specification);
    } catch (error) {
      throw error;
    }
  }

  deleteSpecification(id) {
    try {
      this.specifications.delete(id);
      this.deleteInteractionFile(id);
    } catch (error) {
      throw error;
    }
  }

  updateInteractionSpecs(specs) {
    if (!this.verifySpecification(specs)) {
      throw 'interaction specification could not be verified';
    }

    let interaction = this.specifications.get(specs.id);
    if (typeof interaction === 'undefined') {
      throw 'interaction with ID ' + specs.id + ' could not be found';
    }

    try {
      this.specifications.set(specs.id, specs);
      this.deleteInteractionFile(specs.id);
      this.saveInteractionSpecsToFile(specs);
    } catch (error) {
      throw error;
    }
  }

  loadInteractionFiles() {
    fs.readdir(this.directory, (err, files) => {
      if (err) {
        return console.info('InteractionDatabase - Unable to scan directory: ' + err);
      }

      files.forEach((file) => {
        this.loadInteractionSpecsFromFile(this.directory + '/' + file);
      });
    });
  }

  loadInteractionSpecsFromFile(path) {
    fs.readFile(path, (err, data) => {
      if (err) throw err;

      let specs = JSON.parse(data);

      if (this.specifications.has(specs.id)) {
        console.info('InteractionDatabase - interaction from file ' + path + ' has conflicting ID ' + specs.id);
      } else {
        this.specifications.set(specs.id, specs);
        this.filepaths.set(specs.id, path);
      }
    });
  }

  saveInteractionSpecsToFile(specs) {
    let path = this.directory + '/';
    if (specs.name && specs.name.length > 0) {
      path += specs.name + '_';
    }
    path += specs.id + '.interaction';

    if (this.verifySpecification(specs)) {
      try {
        fs.writeFileSync(path, JSON.stringify(specs, null, 4), {flag: 'wx'});
        this.filepaths.set(specs.id, path);
      } catch (error) {
        if (error) throw error;
      }
    } else {
      throw 'Invalid interaction specifications';
    }
  }

  replaceInteractionSpecsFile(specs) {
    if (this.verifySpecification(specs)) {
      try {
        fs.writeFileSync(this.filepaths.get(specs.id), JSON.stringify(specs, null, 4), {flag: 'w'});
      } catch (error) {
        if (error) throw error;
      }
    } else {
      throw 'Invalid interaction specifications';
    }
  }

  deleteInteractionFile(id) {
    let path = this.filepaths.get(id);
    if (typeof path !== 'undefined') {
      fs.unlinkSync(path);
    }
  }

  verifySpecification(specs) {
    let translator = new ProtobufTranslator(MSG_TYPES.INTERACTION);
    let result = false;
    try {
      result = translator.verify(specs);
    }
    catch (error) {
      result = false;
    }

    return result;
  }
}