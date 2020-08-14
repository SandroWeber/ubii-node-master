import test from 'ava';

import { ProcessingModule } from '../../src/index';
import Utils from '../../src/utilities';

/* prepare tests */

test.beforeEach((t) => {});

/* run tests */

test('constructor() - no params', (t) => {
  let processingModule = new ProcessingModule();
  t.not(processingModule, undefined);
  let regexUUID = new RegExp(Utils.getUUIDv4Regex());
  t.true(regexUUID.test(processingModule.id));
});

test('constructor() - with specs', (t) => {
  let specs = {
    id: 'test-id',
    name: 'test-name'
  };
  let processingModule = new ProcessingModule(specs);
  t.is(processingModule.id, specs.id);
  t.is(processingModule.name, specs.name);
});
