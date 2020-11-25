const fs = require('fs');
const path = require('path');
const shelljs = require('shelljs');

const namida = require('@tum-far/namida/src/namida');

const { BASE_FOLDER_LOCAL_DB, BASE_FOLDER_ONLINE_DB } = require('./storageConstants');

class StorageEntry {
  constructor(key, fileEnding, fileData) {
    this.key = key;
    this.fileEnding = fileEnding;
    this.fileData = fileData;
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
    // online database disabled for now
    //this.onlineDirectory = BASE_FOLDER_ONLINE_DB + '/' + this.subFolder;

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
    // online database disabled for now
    //this.loadDirectory(this.onlineDirectory, this.onlineEntries);
  }

  /**
   * Adds a file handler.
   * @param {FileHandler} handler - file handler to add
   */
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
   * Add a new entry to the local list.
   * @param {StorageEntry} entry - The entry, requires a key property.
   */
  addEntry(entry) {
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
    this.localEntries.delete(key);
    this.deleteEntryFile(key);
  }

  /**
   * Update an entry that is already present in the local list with a new value.
   * @param {StorageEntry} newEntry - The new entry to update the old one with the same key.
   */
  updateEntry(newEntry) {
    if (!this.localEntries.has(newEntry.key)) {
      namida.logFailure(
        this.toString(),
        'could not update entry with key "' + newEntry.key + '", no such entry existing'
      );
      return;
    }

    this.localEntries.set(newEntry.key, newEntry);
    this.deleteEntryFile(newEntry.key);
    this.writeEntryToFile(newEntry);
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
   * Saves an entry to a file with the help of the corresponding FileHandler.
   * @param {StorageEntry} entry - The entry to write.
   */
  writeEntryToFile(entry) {
    if (!entry.key) {
      namida.logFailure(this.toString(), 'could not save entry to file, no key given');
      return;
    }
    if (!entry.fileEnding) {
      namida.logFailure(
        this.toString(),
        'could not save entry "' + entry.key + '" to file, no file ending given'
      );
      return;
    }

    let fileHandler = this.fileHandlers.get(entry.fileEnding);
    fileHandler.writeFile(this.getLocalEntryFilepath(entry), entry.fileData);
  }

  /**
   * Replaces a specification file with the path stored with regard to the is of the specification with a new specification file.
   * @param {object} specification - The specification requires a name property.
   */
  //TODO: outdated
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

  //TODO: re-implement
  async copySpecsFromFile() {}

  /**
   * Checks whether the passed object has a valid entry specification.
   * @param {object} entry - object to test
   */
  isValidEntry(entry) {
    return entry.key && entry.key.length > 0 && !this.hasEntry(entry.key);
  }

  /**
   * Gives a filepath for a local StorageEntry.
   * @param {StorageEntry} entry - the storage entry
   * @returns {string} - the path to the local file
   */
  getLocalEntryFilepath(entry) {
    return this.localDirectory + '/' + entry.key + entry.fileEnding;
  }

  toString() {
    return 'Storage(' + this.fileEndings.toString() + ')';
  }
}

module.exports = { Storage, StorageEntry, FileHandler };
