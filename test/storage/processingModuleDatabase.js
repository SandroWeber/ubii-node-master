import test from 'ava';
import path from 'path';

import ProcessingModuleDatabase from '../../src/storage/processingModuleDatabase';

/* test setup */

test.beforeEach((t) => {
  ProcessingModuleDatabase.localDirectory = path.join(__dirname, '../files/processing').normalize();
});

/* run tests */

test('import local PMs written in .js', async (t) => {
  ProcessingModuleDatabase.loadLocalJsModules();
  t.is(ProcessingModuleDatabase.localJsPMs.size, 1);
  t.true(ProcessingModuleDatabase.getByName('TestProcessingModuleTF') !== undefined);
});
