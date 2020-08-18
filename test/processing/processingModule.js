import test from 'ava';

import { proto } from '@tum-far/ubii-msg-formats';
const ProcessingModuleProto = proto.ubii.processing.ProcessingModule;

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

test('lifecycle functions should always be defined', (t) => {
  t.true(typeof t.context.processingModule.onCreated === 'function');
  t.true(typeof t.context.processingModule.onProcessing === 'function');
  t.true(typeof t.context.processingModule.onHalted === 'function');
  t.true(typeof t.context.processingModule.onDestroyed === 'function');
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

test('onProcessing(), should throw an error when not set/overwritten', (t) => {
  t.throws(() => {
    t.context.processingModule.onProcessing();
  });
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

test('setInputGetter()', (t) => {
  let module = t.context.processingModule;
  let inputString = 'some string',
    inputBool = true,
    inputInt = 42,
    inputObject = { boolean: true, string: 'string' },
    inputFunction = () => {
      return inputObject;
    },
    inputFunction2 = () => {
      return inputString;
    };
  let internalName = 'myInput';

  // try to set empty internal name
  t.false(module.setInputGetter('', inputString));
  t.is(module.myInput, undefined);
  // try to set undefined getter
  t.false(module.setInputGetter(internalName, undefined));
  t.is(module.myInput, undefined);
  // try to set getter to things other than a function
  t.false(module.setInputGetter(internalName, inputString));
  t.is(module.myInput, undefined);
  t.false(module.setInputGetter(internalName, inputBool));
  t.is(module.myInput, undefined);
  t.false(module.setInputGetter(internalName, inputInt));
  t.is(module.myInput, undefined);
  t.false(module.setInputGetter(internalName, inputObject));
  t.is(module.myInput, undefined);
  // proper call with function
  t.true(module.setInputGetter(internalName, inputFunction, true));
  t.deepEqual(module.myInput, inputFunction());

  // try to set same input again without overwrite
  t.false(module.setInputGetter(internalName, inputFunction2));
  t.deepEqual(module.myInput, inputFunction());
  // this time with overwrite
  t.true(module.setInputGetter(internalName, inputFunction2, true));
  t.deepEqual(module.myInput, inputString);
});

test('setOutputSetter()', (t) => {
  let module = t.context.processingModule;
  let outputVerifier = 1;
  let outputString = 'some string',
    outputBool = true,
    outputInt = 42,
    outputObject = { boolean: true, string: 'string' },
    outputFunction = (value) => {
      outputVerifier = value;
    };
  let internalName = 'myOutput';

  // try to set empty internal name
  t.false(module.setOutputSetter('', outputVerifier));
  t.is(module.myOutput, undefined);
  // try to set undefined setter
  t.false(module.setOutputSetter(internalName, undefined));
  t.is(module.myOutput, undefined);
  // try to set setter to things other than a function
  t.false(module.setOutputSetter(internalName, outputVerifier));
  module.myOutput = outputString;
  t.is(outputVerifier, 1);
  module.myOutput = outputBool;
  t.is(outputVerifier, 1);
  module.myOutput = outputInt;
  t.is(outputVerifier, 1);
  module.myOutput = outputObject;
  t.is(outputVerifier, 1);
  // proper call with function
  t.true(module.setOutputSetter(internalName, outputFunction));
  module.myOutput = outputObject;
  t.deepEqual(outputVerifier, outputObject);

  /*module.setOutputSetter(internalName, outputVerifier);
  // proper call with string
  module.myOutput = outputString;
  t.is(outputVerifier, outputString);
  // proper call with bool
  module.myOutput = outputBool;
  t.is(outputVerifier, outputBool);
  // proper call with int
  module.myOutput = outputInt;
  t.is(outputVerifier, outputInt);
  // proper call with object
  module.myOutput = outputObject;
  t.is(outputVerifier, outputObject);
  // proper call with object
  module.myOutput = outputObject;
  t.is(outputVerifier, outputObject);
  // proper call with function (overwrite)
  outputVerifier = undefined;
  module.setOutputSetter(internalName, outputFunction, true);
  module.myOutput = outputObject;
  t.deepEqual(outputVerifier, outputObject);

  // try to set same input again without overwrite
  t.false(module.setOutputSetter(internalName, outputFunction));*/
});
