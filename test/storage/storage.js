import test from 'ava';
import path from 'path';
import fs from 'fs';

import { Storage, FileHandler, StorageEntry } from '../../src/storage/storage';
import { BASE_FOLDER_LOCAL_DB } from '../../src/storage/storageConstants';

/* test setup */

test.beforeEach((t) => {
  t.context.subFolder = 'tests';
  t.context.testDir = BASE_FOLDER_LOCAL_DB + '/' + t.context.subFolder;
  t.context.fileEnding = '.test';

  t.context.fileHandler = new FileHandler(
    t.context.fileEnding,
    //readFile
    (filepath) => {
      let filename = path.basename(filepath);
      let file = fs.readFileSync(filepath);
      let data = JSON.parse(file);
      let entry = new StorageEntry(filename, data);
      let key = path.basename(filename, t.context.fileEnding);
      return { key: key, value: entry };
    },
    //writeFile
    (filepath, data) => {
      fs.writeFileSync(filepath, JSON.stringify(data, null, 4), { flag: 'wx' });
    }
  );

  let data = {
    name: 'test-storage-entry-data'
  };
  t.context.storageEntry = new StorageEntry(data.name + t.context.fileEnding, data);

  t.context.storage = new Storage(t.context.subFolder, [t.context.fileHandler]);
});

test.afterEach((t) => {
  let files = fs.readdirSync(t.context.testDir);
  files.forEach((file) => {
    fs.unlinkSync(t.context.testDir + '/' + file);
  });
  fs.rmdirSync(t.context.testDir, { recursive: true });
});

/* run tests */

test('constructor', (t) => {
  t.true(t.context.storage !== undefined);
});

test('adding file handler', (t) => {
  // adding the same file handler twice
  t.false(t.context.storage.addFileHandler(t.context.fileHandler));
  t.is(t.context.storage.fileHandlers.size, 1);

  // adding a new file handler with the same file ending
  let fileHandler2 = new FileHandler(t.context.fileEnding);
  t.false(t.context.storage.addFileHandler(fileHandler2));
  t.is(t.context.storage.fileHandlers.size, 1);

  // adding a new file handler with a different file ending
  let fileHandler3 = new FileHandler('.test2');
  t.true(t.context.storage.addFileHandler(fileHandler3));
  t.is(t.context.storage.fileHandlers.size, 2);
});

test('entry handling', (t) => {
  let storage = t.context.storage;
  let entry = t.context.storageEntry;
  let filepath = BASE_FOLDER_LOCAL_DB + '/' + entry.key + t.context.fileEnding;

  // add entry
  let entryKey = entry.fileData.name;
  storage.addEntry(entryKey, entry);
  t.true(storage.hasEntry(entryKey));
  t.is(storage.getEntry(entryKey), entry);
  t.is(t.context.storage.localEntries.size, 1);

  // add a second time
  t.false(storage.addEntry(entryKey, entry));
  t.is(t.context.storage.localEntries.size, 1);

  // update entry
  let updatedEntry = new StorageEntry(entry.fileName, {
    name: 'new-test-entry'
  });
  t.true(storage.updateEntry(entryKey, updatedEntry));
  t.is(storage.getEntry(entryKey), updatedEntry);

  // try updating a non-existing entry
  let newKeyEntry = new StorageEntry('some-new-file' + t.context.fileEnding, {});
  t.false(storage.updateEntry('some.new.key', newKeyEntry));

  // delete entry
  storage.deleteEntry(entryKey);
  t.false(fs.existsSync(filepath));
  t.is(t.context.storage.localEntries.size, 0);
});

test('entry lists', (t) => {
  let storage = t.context.storage;
  let entry = t.context.storageEntry;

  storage.localEntries.set(entry.key, entry);
  storage.onlineEntries.set(entry.key, entry);

  let locals = storage.getAllLocalEntries();
  let onlines = storage.getAllOnlineEntries();
  t.is(locals.length, 1);
  t.is(onlines.length, 1);
});

test('initialization, reading/writing local files', (t) => {
  let storage = t.context.storage;
  let entry = t.context.storageEntry;
  t.is(storage.localEntries.size, 0);

  storage.writeEntryToFile(entry);
  storage.initialize();
  t.is(storage.localEntries.size, 1);
  t.deepEqual(storage.getAllLocalEntries()[0], entry);
});
