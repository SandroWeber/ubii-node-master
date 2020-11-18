import test from 'ava';
import path from 'path';

import ProcessingModuleDatabase from '../../src/storage/processingModuleDatabase';

/* test setup */

test.beforeEach((t) => {
  ProcessingModuleDatabase.localDirectory = path.join(__dirname, '../files/processing').normalize();
  ProcessingModuleDatabase.initialize();

  t.context.nameProtoModule = 'TestModuleProto'; // taken from /test/files/processing/my_module.pm
  t.context.nameJsModule = 'TestProcessingModuleTF'; // taken from /test/files/processing/testProcessingModuleTF.js
});

/* run tests */

test('import local PMs written in .pm and .js', (t) => {
  t.is(ProcessingModuleDatabase.specificationsLocal.size, 2);
  t.true(ProcessingModuleDatabase.getByName(t.context.nameProtoModule) !== undefined);
  t.true(ProcessingModuleDatabase.getByName(t.context.nameJsModule) !== undefined);
});

test('create instances of modules', (t) => {
  let pmProto = ProcessingModuleDatabase.createInstanceByName(t.context.nameProtoModule);
  let pmJs = ProcessingModuleDatabase.createInstanceByName(t.context.nameJsModule);

  t.notThrows(() => {
    pmProto.onProcessing();
  });
  t.notThrows(() => {
    pmJs.onProcessing();
  });
});
