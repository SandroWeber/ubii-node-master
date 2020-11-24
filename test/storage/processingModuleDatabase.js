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
  t.is(ProcessingModuleDatabase.localEntries.size, 2);
  t.true(ProcessingModuleDatabase.getEntry(t.context.nameProtoModule) !== undefined);
  t.true(ProcessingModuleDatabase.getEntry(t.context.nameJsModule) !== undefined);
});

test('create instances of modules', (t) => {
  let pmProto = ProcessingModuleDatabase.createInstanceByName(t.context.nameProtoModule);
  let pmJs = ProcessingModuleDatabase.createInstanceByName(t.context.nameJsModule);

  t.true(pmProto.id !== undefined && pmProto.id.length > 0);
  t.true(pmJs.id !== undefined && pmJs.id.length > 0);
  t.is(pmProto.name, t.context.nameProtoModule);
  t.is(pmJs.name, t.context.nameJsModule);
});
