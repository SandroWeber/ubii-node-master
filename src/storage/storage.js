const fs = require('fs');
const path = require('path');
const shelljs = require('shelljs');

const namida = require('@tum-far/namida/src/namida');

const { BASE_FOLDER_LOCAL_DB, BASE_FOLDER_ONLINE_DB } = require('./storageConstants');

class StorageEntry {
  constructor(fileName, fileData) {
    this.fileName = fileName;
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
    throw new Error(
      'SpecificationHandler(' +
        this.fileEnding +
        ').readFile() must be overwritten, must return {key, value}'
    );
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

    this.initialize();
  }

  /**
   * Initialize maps for storage and load files.
   */
  initialize() {
    this.localEntries = new Map();
    this.onlineEntries = new Map();

    if (!fs.existsSync(this.localDirectory)) {
      shelljs.mkdir('-p', this.localDirectory);
    }
    this.loadDirectory(this.localDirectory, this.localEntries);

    // online database disabled for now
    //this.onlineDirectory = BASE_FOLDER_ONLINE_DB + '/' + this.subFolder;
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
   * Add a new entry to the local list.
   * @param {string} key - key under which to store entry in the local map
   * @param {StorageEntry} entry - The entry, requires a fileName property.
   */
  addEntry(key, entry) {
    if (this.hasEntry(key)) {
      namida.logFailure(this.toString(), 'can not add entry "' + key + '", key already exists');
      return false;
    }

    try {
      this.writeEntryToFile(entry);
      this.localEntries.set(key, entry);

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete the entry with the specified name from the local list.
   * @param {string} key - key of the entry to delete
   */
  deleteEntry(key) {
    this.deleteEntryFile(key);
    this.localEntries.delete(key);
  }

  /**
   * Update an entry that is already present in the local list with a new value.
   * @param {StorageEntry} newEntry - The new entry to update the old one with the same key.
   */
  updateEntry(key, newEntry) {
    if (!this.localEntries.has(key)) {
      namida.logFailure(
        this.toString(),
        'could not update entry with key "' + newEntry.key + '", no such entry existing'
      );
      return false;
    }

    this.deleteEntryFile(key);
    this.localEntries.set(key, newEntry);
    this.writeEntryToFile(newEntry);

    return true;
  }

  /**
   * Get an array of all local entries.
   * @returns Array of local entries.
   */
  getAllLocalEntries() {
    return Array.from(this.localEntries.values());
  }

  /**
   * Get an array of all online entries.
   * @returns Array of online entries.
   */
  getAllOnlineEntries() {
    return Array.from(this.onlineEntries.values());
  }

  // Storage file utility methods:

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
        let { key, value } = this.loadEntryFromFile(filepath);
        if (key && value) {
          mapStorage.set(key, value);
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
      let { key, value } = fileHandler.readFile(filepath);
      if (!this.isValidMapEntry(key, value)) {
        namida.logFailure(
          this.toString(),
          'entry from file "' +
            filepath +
            '" is not valid: key exists = ' +
            this.hasEntry(key) +
            ', value = ' +
            value
        );
      } else {
        return { key, value };
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
    if (!entry.fileName) {
      namida.logFailure(
        this.toString(),
        'could not save entry "' + entry.fileName + '" to file, no file name given'
      );
      return;
    }

    let fileEnding = path.extname(entry.fileName);
    let fileHandler = this.fileHandlers.get(fileEnding);
    fileHandler.writeFile(this.getLocalEntryFilepath(entry), entry.fileData);
  }

  /**
   * Deletes the file associated with the specified name.
   * @param {string} key - Name of a stored specification.
   */
  deleteEntryFile(key) {
    let filepath = this.getLocalEntryFilepath(this.localEntries.get(key));
    if (typeof filepath !== 'undefined') {
      fs.unlinkSync(filepath);
    }
  }

  /**
   * Checks whether the passed object has a valid entry specification.
   * @param {object} entry - object to test
   */
  isValidMapEntry(key, entry) {
    return key && key.length > 0 && !this.hasEntry(key) && entry !== undefined;
  }

  /**
   * Gives a filepath for a local StorageEntry.
   * @param {StorageEntry} entry - the storage entry
   * @returns {string} - the path to the local file
   */
  getLocalEntryFilepath(entry) {
    return path.join(this.localDirectory, entry.fileName);
  }

  toString() {
    return 'Storage(' + this.fileEndings.toString() + ')';
  }
}

module.exports = { Storage, StorageEntry, FileHandler };
