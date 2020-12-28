import test from 'ava';
import path from 'path';

import ProcessingModuleStorage from '../../src/storage/processingModuleStorage';

/* test setup */

test.beforeEach((t) => {
  ProcessingModuleStorage.localDirectory = path.join(__dirname, '../files/processing').normalize();
  ProcessingModuleStorage.initialize();

  t.context.nameProtoModule = 'TestModuleProto'; // taken from /test/files/processing/my_module.pm
  t.context.nameJsModule = 'TestProcessingModuleTF'; // taken from /test/files/processing/testProcessingModuleTF.js
});

/* run tests */

test('import local PMs written in .pm and .js', (t) => {
  t.is(ProcessingModuleStorage.localEntries.size, 2);
  t.true(ProcessingModuleStorage.getEntry(t.context.nameProtoModule) !== undefined);
  t.true(ProcessingModuleStorage.getEntry(t.context.nameJsModule) !== undefined);
});

test('create instances of modules', (t) => {
  let pmProto = ProcessingModuleStorage.createInstanceByName(t.context.nameProtoModule);
  let pmJs = ProcessingModuleStorage.createInstanceByName(t.context.nameJsModule);

  t.true(pmProto.id !== undefined && pmProto.id.length > 0);
  t.true(pmJs.id !== undefined && pmJs.id.length > 0);
  t.is(pmProto.name, t.context.nameProtoModule);
  t.is(pmJs.name, t.context.nameJsModule);
});
