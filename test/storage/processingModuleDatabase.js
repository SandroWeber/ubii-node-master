import test from 'ava';
import path from 'path';

import ProcessingModuleDatabase from '../../src/storage/processingModuleDatabase';

/* test setup */

test.beforeEach((t) => {
  ProcessingModuleDatabase.localDirectory = path.join(__dirname, '../files/processing').normalize();
});

/* run tests */

test('import local PMs written in .pm', (t) => {
  let expectedName = 'my processing module'; // taken from /test/files/processing/my_module.pm

  ProcessingModuleDatabase.loadLocalDB();
  t.is(ProcessingModuleDatabase.specificationsLocal.size, 1);
  t.true(ProcessingModuleDatabase.getByName(expectedName) !== undefined);
});

test('import local PMs written in .js', (t) => {
  let expectedName = 'TestProcessingModuleTF'; // taken from /test/files/processing/testProcessingModuleTF.js

  ProcessingModuleDatabase.loadLocalJsModules();
  t.is(ProcessingModuleDatabase.localJsPMs.size, 1);
  t.true(ProcessingModuleDatabase.getByName(expectedName) !== undefined);
});
