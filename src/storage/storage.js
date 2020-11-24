const fs = require('fs');
const path = require('path');
const shelljs = require('shelljs');

const namida = require('@tum-far/namida/src/namida');

const { BASE_FOLDER_LOCAL_DB, BASE_FOLDER_ONLINE_DB } = require('./storageConstants');

class StorageEntry {
  constructor(key, filepath, filedata) {
    this.key = key;
    this.filepath = filepath;
    this.filedata = filedata;
  }
}

class FileHandler {
  constructor(fileEnding, readFile, writeFile) {
    this.fileEnding = fileEnding;
    if (readFile) {
      this.readFile = readFile;
    }
    if (writeFile) {
      this.writeFile = writeFile;
    }
  }

  readFile() {
    throw new Error('SpecificationHandler(' + this.fileEnding + ').readFile() must be overwritten');
  }

  writeFile() {
    throw new Error(
      'SpecificationHandler(' + this.fileEnding + ').writeFile() must be overwritten'
    );
  }
}

class Storage {
  constructor(subFolder, listFileHandlers) {
    this.fileHandlers = new Map();
    listFileHandlers.forEach((handler) => {
      this.fileHandlers.set(handler.fileEnding, handler);
    });
    this.fileEndings = Array.from(this.fileHandlers.keys());
    this.subFolder = subFolder;
    this.localDirectory = BASE_FOLDER_LOCAL_DB + '/' + this.subFolder;
    this.onlineDirectory = BASE_FOLDER_ONLINE_DB + '/' + this.subFolder;

    if (!fs.existsSync(this.localDirectory)) {
      shelljs.mkdir('-p', this.localDirectory);
    }

    this.initialize();
  }

  /**
   * Initialize maps for storage and load files.
   */
  initialize() {
    this.localEntries = new Map();
    this.onlineEntries = new Map();

    this.loadDirectory(this.localDirectory, this.localEntries);
    this.loadDirectory(this.onlineDirectory, this.onlineEntries);
  }

  addFileHandler(handler) {
    if (this.fileHandlers.has(handler.fileEnding)) {
      namida.logFailure(
        this.toString(),
        'can not add file handler for ' + handler.fileEnding + ', an entry already exists'
      );
      return false;
    }

    this.fileHandlers.set(handler.fileEnding, handler);
    return true;
  }

  /**
   * Returns whether a specification matching the given specifications exists. Currently only checks for name.
   * @param {string} key
   * @returns {boolean} Does a specification with the given specifications exist?
   */
  hasEntry(key) {
    return this.localEntries.has(key) || this.onlineEntries.has(key);
  }

  /**
   * Get the specification with the specified name.
   * @param {string} key
   * @returns The specification with the specified name.
   */
  getEntry(key) {
    return this.localEntries.get(key) || this.onlineEntries.get(key);
  }

  /**
   * Get an array of all specifications.
   * @returns Array with all specifications.
   */
  getAllLocalEntries() {
    return Array.from(this.localEntries.values());
  }

  getAllOnlineEntries() {
    return Array.from(this.onlineEntries.values());
  }

  /**
   * Add a new specification to the specifications list.
   * @param {object} entry - The specification. It requires a name property.
   * @param {string} fileEnding - file ending, indicating type of entry
   */
  addEntry(entry, fileEnding) {
    if (this.hasEntry(entry.key)) {
      namida.logFailure(
        this.toString(),
        'can not add entry "' + entry.key + '", key already exists'
      );
      throw 'Entry with key ' + entry.key + ' could not be added, key already exists.';
    }

    try {
      this.writeEntryToFile(entry);
      this.localEntries.set(entry.key, entry);

      return entry;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete the entry with the specified name from the local list.
   * @param {string} key - key of the entry to delete
   */
  deleteEntry(key) {
    try {
      this.localEntries.delete(key);
      this.deleteEntryFile(key);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update an entry that is already present in the specifications list with a new value.
   * @param {object} fileContent The specification requires a name property.
   */
  updateEntry(key, newEntry) {
    let entry = this.localEntries.get(key);
    if (typeof entry === 'undefined') {
      throw 'Specification with name ' + key + ' could not be found';
    }

    try {
      let fileEnding = path.extname(newEntry.filepath);
      let fileHandler = this.fileHandlers.get(fileEnding);
      this.localEntries.set(key, newEntry);
      this.deleteEntryFile(key);
      this.writeEntryToFile(newEntry);
    } catch (error) {
      throw error;
    }
  }

  // Storage file utility methods:

  /**
   * Load all specification files that are present in the sub-folder specified for this storage.
   */
  loadLocalDB() {
    try {
      let files = fs.readdirSync(this.localDirectory);
      files.forEach((file) => {
        let filepath = this.localDirectory + '/' + file;
        let entry = this.loadEntryFromFile(filepath);
        if (entry) {
          this.localEntries.set(entry.name, entry);
        }
      });
    } catch (error) {
      namida.log(this.toString(), 'unable to read ' + this.localDirectory);
    }
  }

  loadOnlineDB() {
    try {
      let files = fs.readdirSync(this.onlineDirectory);
      files.forEach((file) => {
        let filepath = this.onlineDirectory + '/' + file;
        let entry = this.loadEntryFromFile(filepath);
        if (entry) {
          this.onlineEntries.set(entry.name, entry);
        }
      });
    } catch (error) {
      namida.log(this.toString(), 'unable to read ' + this.onlineDirectory);
    }
  }

  /**
   * Load all specification files that are present in the sub-folder specified for this storage.
   * Stores entries generated from files in map.
   * @param {string} directoryPath - path to directory
   * @param {Map} mapStorage - Map to store entries in
   */
  loadDirectory(directoryPath, mapStorage) {
    try {
      let files = fs.readdirSync(directoryPath);
      files.forEach((file) => {
        let filepath = directoryPath + '/' + file;
        let entry = this.loadEntryFromFile(filepath);
        if (entry) {
          mapStorage.set(entry.key, entry);
        }
      });
    } catch (error) {
      namida.log(
        this.toString(),
        'error while reading ' + directoryPath + ':\n' + error.toString()
      );
    }
  }

  /**
   * Load a specification from the file with the specified path.
   * @param {string} filepath - Path to the specification file.
   * @returns {object} The entry to the storage read by the fitting file handler if existing.
   */
  loadEntryFromFile(filepath) {
    let fileEnding = path.extname(filepath);
    if (this.fileEndings.includes(fileEnding)) {
      let fileHandler = this.fileHandlers.get(fileEnding);
      let entry = fileHandler.readFile(filepath);
      if (!this.isValidEntry(entry)) {
        namida.logFailure(
          this.toString(),
          'entry from file "' + filepath + '" has conflicting key ' + entry.key
        );
      } else {
        return entry;
      }
    } else {
      namida.logFailure(
        this.toString(),
        'entry from file "' + filepath + '" can not be read, no known file ending ' + fileEnding
      );
    }
  }

  /**
   * Saves a specification to a file with the corresponding path.
   * @param {object} spec - The specification requires a name property.
   */
  writeEntryToFile(entry) {
    if (!entry.key) {
      namida.logFailure(this.toString(), 'could not save entry to file, no key given');
      return;
    }

    let fileHandler = this.fileHandlers.get(fileEnding);
    if (!fileEnding) {
      namida.logFailure(
        this.toString(),
        'can not add entry "' + entry.key + '", no file handler for ' + fileEnding
      );
      throw 'Entry with key "' + entry.key + '", no file handler for ' + fileEnding;
    }

    let filepath = this.localDirectory + '/' + entry.key + fileEnding;
    entry.filepath = filepath;

    fileHandler.writeFile(filepath, entry.filedata);

    let fileEnding = path.extname(entry.filepath);
    let fileHandler = this.fileHandlers.get(fileEnding);
    fileHandler && fileHandler.writeFile(entry.filepath, entry.filedata);
  }

  /**
   * Replaces a specification file with the path stored with regard to the is of the specification with a new specification file.
   * @param {object} specification - The specification requires a name property.
   */
  replaceSpecificationFile(specification) {
    try {
      fs.writeFileSync(
        this.localEntries.get(specification.name).filepath,
        JSON.stringify(specification, null, 4),
        { flag: 'w' }
      );
    } catch (error) {
      if (error) throw error;
    }
  }

  /**
   * Deletes the file associated with the specified name.
   * @param {string} key - Name of a stored specification.
   */
  deleteEntryFile(key) {
    let filepath = this.localEntries.get(key).filepath;
    if (typeof filepath !== 'undefined') {
      fs.unlinkSync(filepath);
    }
  }

  async copySpecsFromFile() {
    //TODO: re-implement
  }

  /**
   * Checks whether the passed object has a valid entry specification.
   * @param {object} entry - object to test
   */
  isValidEntry(entry) {
    return entry.key && entry.key.length > 0 && !this.hasEntry(entry.key);
  }

  toString() {
    return 'Storage(' + this.fileEndings.toString() + ')';
  }
}

module.exports = { Storage, StorageEntry, FileHandler };
