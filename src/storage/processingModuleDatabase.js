const fs = require('fs');

const namida = require('@tum-far/namida/src/namida');
const { ProtobufTranslator, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Storage, FileHandler, StorageEntry } = require('./storage.js');
const { ProcessingModule } = require('../processing/processingModule.js');

class ProcessingModuleDatabase extends Storage {
  constructor() {
    let fileHandlerProto = new FileHandler(
      '.pm',
      // read
      (filepath) => {
        let file = fs.readFileSync(filepath);
        let proto = JSON.parse(file);
        let entry = new StorageEntry(proto.name, filepath);
        entry.protobuf = proto;
        entry.createInstance = () => {
          return new ProcessingModule(proto);
        };
        return entry;
      },
      // write
      (filepath, protoSpecs) => {
        try {
          fs.writeFileSync(filepath, JSON.stringify(protoSpecs, null, 4), { flag: 'wx' });
        } catch (error) {
          if (error) throw error;
        }
      }
    );

    let fileHandlerJs = new FileHandler(
      '.js',
      // read
      (filepath) => {
        let pmClass = require(filepath);
        let pm = new pmClass();
        let proto = pm.toProtobuf();
        delete proto.id;
        let entry = new StorageEntry(proto.name, filepath);
        entry.protobuf = proto;
        entry.createInstance = () => {
          return new pmClass();
        };
        return entry;
      },
      // write
      (filepath, jsBlob) => {
        //TODO: implement
      }
    );
    let mapFileHandlers = new Map();
    mapFileHandlers.set(fileHandlerProto.fileEnding, fileHandlerProto);
    mapFileHandlers.set(fileHandlerJs.fileEnding, fileHandlerJs);
    super('processing', mapFileHandlers);
  }

  /**
   * Returns whether a processing module specification matching the given specifications exists.
   * @param {object} specs
   * @returns {Boolean} Does a processing module specification with the given specifications exist?
   */
  has(specs) {
    return this.hasEntry(specs);
  }

  /**
   * Get the processing module with the specified name.
   * @param {string} name
   * @returns {(object|constructor)} The JSON object or the constructor of the JS class for the module
   */
  getByName(name) {
    return this.getEntry(name);
  }

  /**
   * Get an array of all specifications.
   */
  getList() {
    return this.getAllLocalEntries();
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
    this.deleteEntry(name);
  }

  /**
   * Update a processing module specification that is already present in the specifications list with a new value.
   * @param {Object} spec The specification requires a name property.
   */
  update(spec) {
    if (!this.verifySpecification(spec)) {
      throw 'Processing Module specification could not be verified';
    }

    this.updateEntry(spec);
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

  createInstanceByName(name) {
    let pm = this.getByName(name).createInstance();
    return pm;
  }
}

module.exports = new ProcessingModuleDatabase();
