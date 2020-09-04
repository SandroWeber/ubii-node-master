import test from 'ava';
import sinon from 'sinon';

import { proto } from '@tum-far/ubii-msg-formats';
const ProcessingModuleProto = proto.ubii.processing.ProcessingModule;

import { ProcessingModule } from '../../src/index';
import Utils from '../../src/utilities';

/* prepare tests */

test.beforeEach((t) => {
  t.context.moduleSpecs = {
    name: 'test-module',
    inputs: [
      {
        internalName: 'inString',
        messageFormat: 'string'
      },
      {
        internalName: 'inBool',
        messageFormat: 'bool'
      },
      {
        internalName: 'inInt',
        messageFormat: 'int32'
      }
    ],
    outputs: [
      {
        internalName: 'outString',
        messageFormat: 'string'
      },
      {
        internalName: 'outBool',
        messageFormat: 'bool'
      },
      {
        internalName: 'outInt',
        messageFormat: 'int32'
      }
    ]
  };
  t.context.processingModule = new ProcessingModule(t.context.moduleSpecs);
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
    inputFunctionObject = () => {
      return inputObject;
    },
    inputFunctionString = () => {
      return inputString;
    };
  let internalName = 'myInput';

  // try to use internal name that conflicts with another property
  let takenPropertyName = 'id';
  t.false(module.setInputGetter(takenPropertyName, inputFunctionObject));
  t.is(module.ioProxy[takenPropertyName], undefined);
  // try to set empty internal name
  t.false(module.setInputGetter('', inputFunctionObject));
  t.is(module.ioProxy.myInput, undefined);
  t.is(module.myInput, undefined);
  // try to set undefined getter
  t.false(module.setInputGetter(internalName, undefined));
  t.is(module.ioProxy.myInput, undefined);
  t.is(module.myInput, undefined);
  // try to set getter to things other than a function
  t.false(module.setInputGetter(internalName, inputString));
  t.is(module.ioProxy.myInput, undefined);
  t.is(module.myInput, undefined);
  t.false(module.setInputGetter(internalName, inputBool));
  t.is(module.ioProxy.myInput, undefined);
  t.is(module.myInput, undefined);
  t.false(module.setInputGetter(internalName, inputInt));
  t.is(module.ioProxy.myInput, undefined);
  t.is(module.myInput, undefined);
  t.false(module.setInputGetter(internalName, inputObject));
  t.is(module.ioProxy.myInput, undefined);
  t.is(module.myInput, undefined);
  // proper call with function
  t.true(module.setInputGetter(internalName, inputFunctionObject));
  t.deepEqual(module.ioProxy.myInput, inputObject);
  // check that shortcut result is the same
  t.deepEqual(module.myInput, inputObject);
  t.is(module.myInput, module.ioProxy.myInput);

  // try to set same input again without overwrite
  t.false(module.setInputGetter(internalName, inputFunctionString));
  t.deepEqual(module.ioProxy.myInput, inputObject);
  // this time with overwrite
  t.true(module.setInputGetter(internalName, inputFunctionString, true));
  t.is(module.ioProxy.myInput, inputString);
  t.is(module.myInput, inputString);
});

test('setOutputSetter()', (t) => {
  let module = t.context.processingModule;
  let outputVerifier = 1;
  let outputString = 'some string',
    outputBool = true,
    outputObject = { boolean: true, string: 'string' },
    outputFunction = (value) => {
      outputVerifier = value;
    };
  let internalName = 'myOutput';

  // try to set empty internal name
  t.false(module.setOutputSetter('', outputVerifier));
  t.is(module[internalName], undefined);
  // try to set undefined setter
  t.false(module.setOutputSetter(internalName, undefined));
  t.is(module[internalName], undefined);
  // try to use internal name that conflicts with another property
  t.false(module.setOutputSetter('id', outputFunction));
  t.is(module[internalName], undefined);
  // try to set setter to things other than a function
  t.false(module.setOutputSetter(internalName, outputVerifier));
  module[internalName] = outputString;
  t.is(outputVerifier, 1);
  // proper call with function
  delete module[internalName];
  t.true(module.setOutputSetter(internalName, outputFunction));
  module.ioProxy[internalName] = outputObject;
  t.deepEqual(outputVerifier, outputObject);
  // check that shortcut result is the same
  module[internalName] = outputBool;
  t.is(outputVerifier, outputBool);
  // try to set same input again without overwrite
  t.false(module.setOutputSetter(internalName, outputFunction));
});

test('removeIOAccessor()', (t) => {
  let module = t.context.processingModule;
  // check for input getter
  let inputFunction = sinon.fake.returns(true);
  t.true(module.setInputGetter('myInput', inputFunction));
  t.true(module.myInput !== undefined);
  t.is(inputFunction.callCount, 1);
  module.removeIOAccessor('myInput');
  t.is(module.ioProxy.myInput, undefined);
  t.is(module.myInput, undefined);
  t.is(inputFunction.callCount, 1);
  // check for output setter
  let outputFunction = sinon.fake();
  module.setOutputSetter('myOutput', outputFunction);
  module.myOutput = true;
  t.is(outputFunction.callCount, 1);
  module.removeIOAccessor('myOutput');
  t.is(module.ioProxy.myOutput, undefined);
  t.is(module.myOutput, undefined);
  module.myOutput = true;
  t.is(outputFunction.callCount, 1);
});

test('removeAllIOAccessors()', (t) => {
  let module = t.context.processingModule;
  // set getter/setter
  let inputFunction = sinon.fake(() => {});
  t.true(module.setInputGetter('myInput', inputFunction));
  let outputFunction = sinon.fake();
  t.true(module.setOutputSetter('myOutput', outputFunction));
  module.removeAllIOAccessors();
  // call getter/setter
  t.is(module.myInput, undefined);
  module.myOutput = true;
  // callbacks should not have been called
  t.false(inputFunction.calledOnce);
  t.false(outputFunction.calledOnce);
});

test('readInput()', (t) => {
  let module = t.context.processingModule;
  let inputFunction = sinon.fake.returns(42);
  t.true(module.setInputGetter('myInput', inputFunction));
  t.is(module.readInput('myInput'), 42);
  t.true(inputFunction.calledOnce);
});

test('writeOutput()', (t) => {
  let module = t.context.processingModule;
  let verifier = undefined;
  let outputFunction = sinon.fake((value) => {
    verifier = value;
  });
  t.true(module.setOutputSetter('myOutput', outputFunction));
  module.writeOutput('myOutput', 42);
  t.is(verifier, 42);
  t.true(outputFunction.calledOnce);
});

test('getIOMessageFormat()', (t) => {
  let module = t.context.processingModule;
  t.is(module.getIOMessageFormat('inString'), 'string');
  t.is(module.getIOMessageFormat('outBool'), 'bool');
});

test('checkInternalName()', (t) => {
  let module = t.context.processingModule;
  // class porperties should not be valid, even if not used as I/O names yet
  t.false(module.checkInternalName('id'));
  // empty internal name should not be valid
  t.false(module.checkInternalName(''));
  // a viable name
  t.true(module.checkInternalName('myInternalVariable'));
  // something that is already taken
  module.ioProxy.myInternalVariable = true;
  t.false(module.checkInternalName('myInternalVariable'));
  // something that is already taken but with overwrite
  t.true(module.checkInternalName('myInternalVariable', true));
});
