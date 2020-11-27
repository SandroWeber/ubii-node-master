const fs = require('fs');
const path = require('path');

const namida = require('@tum-far/namida/src/namida');
const { ProtobufTranslator, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Storage, FileHandler, StorageEntry } = require('./storage.js');
const { ProcessingModule } = require('../processing/processingModule.js');

class PMFileHandlerProtobuf extends FileHandler {
  constructor() {
    super('.pm');
  }

  readFile(filepath) {
    let filename = path.basename(filepath);
    if (path.extname(filename) !== this.fileEnding) {
      namida.logFailure(
        'PMFileHandlerProtobuf',
        'file ' + filename + ' is not of type ' + this.fileEnding
      );
      return;
    }

    let file = fs.readFileSync(filepath);
    let protobuf = JSON.parse(file);
    let entry = new StorageEntry(filename, protobuf);
    entry.createInstance = () => {
      return new ProcessingModule(protobuf);
    };

    return {
      key: protobuf.name,
      value: entry
    };
  }

  writeFile(filepath, protoSpecs) {
    try {
      fs.writeFileSync(filepath, JSON.stringify(protoSpecs, null, 4), { flag: 'wx' });
    } catch (error) {
      if (error) throw error;
    }
  }
}

class PMFileHandlerJS extends FileHandler {
  constructor() {
    super('.js');
  }

  readFile(filepath) {
    let filename = path.basename(filepath);
    if (path.extname(filename) !== this.fileEnding) {
      namida.logFailure(
        'PMFileHandlerProtobuf',
        'file ' + filename + ' is not of type ' + this.fileEnding
      );
      return;
    }

    let pmClass = require(filepath);
    let pm = new pmClass();
    let protobuf = pm.toProtobuf();
    delete protobuf.id;
    let entry = new StorageEntry(filename, pmClass);
    entry.createInstance = () => {
      return new pmClass();
    };

    return {
      key: protobuf.name,
      value: entry
    };
  }

  writeFile(filepath, jsBlob) {
    //TODO: implement?
  }
}

class ProcessingModuleDatabase extends Storage {
  constructor() {
    let fileHandlerProto = new PMFileHandlerProtobuf();
    let fileHandlerJs = new PMFileHandlerJS();
    super('processing', [fileHandlerProto, fileHandlerJs]);
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
      return this.addEntry(spec.name, spec);
    } catch (error) {
      throw error;
    }
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
    let pm = this.getEntry(name).createInstance();
    return pm;
  }
}

module.exports = new ProcessingModuleDatabase();
