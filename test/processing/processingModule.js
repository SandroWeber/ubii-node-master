import test from 'ava';
import sinon from 'sinon';

import { proto } from '@tum-far/ubii-msg-formats';
const ProcessingModuleProto = proto.ubii.processing.ProcessingModule;
import namida from '@tum-far/namida/src/namida';

import { ProcessingModule } from '../../src/index';
import Utils from '../../src/utilities';

/* prepare tests */

test.beforeEach((t) => {
  t.context.processingModule = new ProcessingModule({
    name: 'test-module'
  });
});

/* run tests */

test('constructor() - no params', (t) => {
  let processingModule = new ProcessingModule();
  t.not(processingModule, undefined);
  let regexUUID = new RegExp(Utils.getUUIDv4Regex());
  t.true(regexUUID.test(processingModule.id));
});

test('constructor() - with specs', (t) => {
  // leave out ID
  let specs = {
    name: 'test-name',
    authors: ['a', 'b'],
    description: 'test-description'
  };
  let processingModule = new ProcessingModule(specs);
  // ID should be set if left out
  let regexUUID = new RegExp(Utils.getUUIDv4Regex());
  t.true(regexUUID.test(processingModule.id));
  t.is(processingModule.name, specs.name);
  t.is(processingModule.authors, specs.authors);
  t.is(processingModule.description, specs.description);

  // with ID defined,
  specs.id = 'my-id';
  processingModule = new ProcessingModule(specs);
  t.is(processingModule.id, specs.id);

  // trying to specify language within JS that is not JS
  specs.language = ProcessingModuleProto.Language.CPP;
  t.throws(() => {
    let processingModule = new ProcessingModule(specs);
  });
});

test('setOnCreated()', (t) => {
  let cb = () => {};
  t.context.processingModule.setOnCreated(cb);
  t.is(t.context.processingModule.onCreated, cb);
});

test('setOnProcessing()', (t) => {
  let cb = () => {};
  t.context.processingModule.setOnProcessing(cb);
  t.is(t.context.processingModule.onProcessing, cb);
});

test('setOnHalted()', (t) => {
  let cb = () => {};
  t.context.processingModule.setOnHalted(cb);
  t.is(t.context.processingModule.onHalted, cb);
});

test('setOnDestroyed()', (t) => {
  let cb = () => {};
  t.context.processingModule.setOnDestroyed(cb);
  t.is(t.context.processingModule.onDestroyed, cb);
});

test('onProcessing(), should error log and throw an error when not set/overwritten', (t) => {
  sinon.spy(namida, 'error');
  t.throws(() => {
    t.context.processingModule.onProcessing();
  });
  t.true(namida.error.calledOnce);
});

test('onProcessing(), should work normally when properly set', (t) => {
  let counter = 0;
  let increment = () => {
    counter++;
  };
  t.context.processingModule.setOnProcessing(increment);
  t.notThrows(() => {
    t.context.processingModule.onProcessing();
  });
  t.is(counter, 1);
});
