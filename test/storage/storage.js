import test from 'ava';
import path from 'path';
import fs from 'fs';

import { Storage, FileHandler, StorageEntry } from '../../src/storage/storage';
import { BASE_FOLDER_LOCAL_DB } from '../../src/storage/storageConstants';

/* test setup */

test.beforeEach((t) => {
  t.context.subFolder = 'tests';
  t.context.fileEnding = '.test';

  t.context.fileHandler = new FileHandler(
    t.context.fileEnding,
    (filepath) => {
      let filename = path.basename(filepath, this.fileEnding);
      let file = fs.readFileSync(filepath);
      let data = JSON.parse(file);
      let entry = new StorageEntry(filename, this.fileEnding, data);
      return entry;
    },
    (filepath, data) => {
      fs.writeFileSync(filepath, JSON.stringify(data, null, 4), { flag: 'wx' });
    }
  );

  let data = {
    name: 'test-storage-entry-data'
  };
  t.context.storageEntry = new StorageEntry(data.name, t.context.fileEnding, data);

  t.context.storage = new Storage(t.context.subFolder, [t.context.fileHandler]);
});

test.afterEach((t) => {
  let testDir = BASE_FOLDER_LOCAL_DB + '/' + t.context.subFolder;
  let files = fs.readdirSync(testDir);
  files.forEach((file) => {
    fs.unlinkSync(testDir + '/' + file);
  });
  fs.rmdirSync(testDir, { recursive: true });
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
  storage.addEntry(entry);
  t.true(storage.hasEntry(entry.key));
  t.is(storage.getEntry(entry.key), entry);
  t.is(t.context.storage.localEntries.size, 1);

  // add a second time
  t.false(storage.addEntry(entry));
  t.is(t.context.storage.localEntries.size, 1);

  // delete entry
  storage.deleteEntry(entry.key);
  t.false(fs.existsSync(filepath));
  t.is(t.context.storage.localEntries.size, 0);
});
