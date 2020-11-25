import test from 'ava';
import path from 'path';

import { Storage, FileHandler, StorageEntry } from '../../src/storage/storage';

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
  t.true(t.context.storage !== undefined);
});
