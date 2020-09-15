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

test('setOnCreated() / onCreated()', (t) => {
  let cb = sinon.fake();
  t.context.processingModule.setOnCreated(cb);
  t.is(t.context.processingModule.onCreated, cb);
  t.context.processingModule.onCreated();
  t.is(cb.callCount, 1);
});

test('setOnProcessing() / onProcessing()', (t) => {
  let cb = sinon.fake();
  t.context.processingModule.setOnProcessing(cb);
  t.is(t.context.processingModule.onProcessing, cb);
  t.context.processingModule.onProcessing();
  t.is(cb.callCount, 1);
});

test('setOnHalted() / onHalted()', (t) => {
  let cb = sinon.fake();
  t.context.processingModule.setOnHalted(cb);
  t.is(t.context.processingModule.onHalted, cb);
  t.context.processingModule.onHalted();
  t.is(cb.callCount, 1);
});

test('setOnDestroyed() / onDestroyed()', (t) => {
  let cb = sinon.fake();
  t.context.processingModule.setOnDestroyed(cb);
  t.is(t.context.processingModule.onDestroyed, cb);
  t.context.processingModule.onDestroyed();
  t.is(cb.callCount, 1);
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
  let pm = t.context.processingModule;
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
  t.false(pm.setInputGetter(takenPropertyName, inputFunctionObject));
  t.is(pm.ioProxy[takenPropertyName], undefined);
  // try to set empty internal name
  t.false(pm.setInputGetter('', inputFunctionObject));
  t.is(pm.ioProxy.myInput, undefined);
  t.is(pm.myInput, undefined);
  // try to set undefined getter
  t.false(pm.setInputGetter(internalName, undefined));
  t.is(pm.ioProxy.myInput, undefined);
  t.is(pm.myInput, undefined);
  // try to set getter to things other than a function
  t.false(pm.setInputGetter(internalName, inputString));
  t.is(pm.ioProxy.myInput, undefined);
  t.is(pm.myInput, undefined);
  t.false(pm.setInputGetter(internalName, inputBool));
  t.is(pm.ioProxy.myInput, undefined);
  t.is(pm.myInput, undefined);
  t.false(pm.setInputGetter(internalName, inputInt));
  t.is(pm.ioProxy.myInput, undefined);
  t.is(pm.myInput, undefined);
  t.false(pm.setInputGetter(internalName, inputObject));
  t.is(pm.ioProxy.myInput, undefined);
  t.is(pm.myInput, undefined);
  // proper call with function
  t.true(pm.setInputGetter(internalName, inputFunctionObject));
  t.deepEqual(pm.ioProxy.myInput, inputObject);
  // check that shortcut result is the same
  t.deepEqual(pm.myInput, inputObject);
  t.is(pm.myInput, pm.ioProxy.myInput);

  // try to set same input again without overwrite
  t.false(pm.setInputGetter(internalName, inputFunctionString));
  t.deepEqual(pm.ioProxy.myInput, inputObject);
  // this time with overwrite
  t.true(pm.setInputGetter(internalName, inputFunctionString, true));
  t.is(pm.ioProxy.myInput, inputString);
  t.is(pm.myInput, inputString);
});

test('setOutputSetter()', (t) => {
  let pm = t.context.processingModule;
  let outputVerifier = 1;
  let outputString = 'some string',
    outputBool = true,
    outputObject = { boolean: true, string: 'string' },
    outputFunction = (value) => {
      outputVerifier = value;
    };
  let internalName = 'myOutput';

  // try to set empty internal name
  t.false(pm.setOutputSetter('', outputVerifier));
  t.is(pm[internalName], undefined);
  // try to set undefined setter
  t.false(pm.setOutputSetter(internalName, undefined));
  t.is(pm[internalName], undefined);
  // try to use internal name that conflicts with another property
  t.false(pm.setOutputSetter('id', outputFunction));
  t.is(pm[internalName], undefined);
  // try to set setter to things other than a function
  t.false(pm.setOutputSetter(internalName, outputVerifier));
  pm[internalName] = outputString;
  t.is(outputVerifier, 1);
  // proper call with function
  delete pm[internalName];
  t.true(pm.setOutputSetter(internalName, outputFunction));
  pm.ioProxy[internalName] = outputObject;
  t.deepEqual(outputVerifier, outputObject);
  // check that shortcut result is the same
  pm[internalName] = outputBool;
  t.is(outputVerifier, outputBool);
  // try to set same input again without overwrite
  t.false(pm.setOutputSetter(internalName, outputFunction));
});

test('removeIOAccessor()', (t) => {
  let pm = t.context.processingModule;
  // check for input getter
  let inputFunction = sinon.fake.returns(true);
  t.true(pm.setInputGetter('myInput', inputFunction));
  t.true(pm.myInput !== undefined);
  t.is(inputFunction.callCount, 1);
  pm.removeIOAccessor('myInput');
  t.is(pm.ioProxy.myInput, undefined);
  t.is(pm.myInput, undefined);
  t.is(inputFunction.callCount, 1);
  // check for output setter
  let outputFunction = sinon.fake();
  pm.setOutputSetter('myOutput', outputFunction);
  pm.myOutput = true;
  t.is(outputFunction.callCount, 1);
  pm.removeIOAccessor('myOutput');
  t.is(pm.ioProxy.myOutput, undefined);
  t.is(pm.myOutput, undefined);
  pm.myOutput = true;
  t.is(outputFunction.callCount, 1);
});

test('removeAllIOAccessors()', (t) => {
  let pm = t.context.processingModule;
  // set getter/setter
  let inputFunction = sinon.fake(() => {});
  t.true(pm.setInputGetter('myInput', inputFunction));
  let outputFunction = sinon.fake();
  t.true(pm.setOutputSetter('myOutput', outputFunction));
  pm.removeAllIOAccessors();
  // call getter/setter
  t.is(pm.myInput, undefined);
  pm.myOutput = true;
  // callbacks should not have been called
  t.false(inputFunction.calledOnce);
  t.false(outputFunction.calledOnce);
});

test('readInput()', (t) => {
  let pm = t.context.processingModule;
  let inputFunction = sinon.fake.returns(42);
  t.true(pm.setInputGetter('myInput', inputFunction));
  t.is(pm.readInput('myInput'), 42);
  t.true(inputFunction.calledOnce);
});

test('writeOutput()', (t) => {
  let pm = t.context.processingModule;
  let verifier = undefined;
  let outputFunction = sinon.fake((value) => {
    verifier = value;
  });
  t.true(pm.setOutputSetter('myOutput', outputFunction));
  pm.writeOutput('myOutput', 42);
  t.is(verifier, 42);
  t.true(outputFunction.calledOnce);
});

test('getIOMessageFormat()', (t) => {
  let pm = t.context.processingModule;
  t.is(pm.getIOMessageFormat('inString'), 'string');
  t.is(pm.getIOMessageFormat('outBool'), 'bool');
});

test('checkInternalName()', (t) => {
  let pm = t.context.processingModule;
  // class porperties should not be valid, even if not used as I/O names yet
  t.false(pm.checkInternalName('id'));
  // empty internal name should not be valid
  t.false(pm.checkInternalName(''));
  // a viable name
  t.true(pm.checkInternalName('myInternalVariable'));
  // something that is already taken
  pm.ioProxy.myInternalVariable = true;
  t.false(pm.checkInternalName('myInternalVariable'));
  // something that is already taken but with overwrite
  t.true(pm.checkInternalName('myInternalVariable', true));
});

test('processingMode Frequency', (t) => {
  let pm = new ProcessingModule({
    processingMode: {
      frequency: {
        hertz: 30
      }
    }
  });
  let processingCB = sinon.fake((deltaT, inputs, outputs, state) => {
    t.true(deltaT !== undefined);
  });
  pm.setOnProcessing(processingCB);
  pm.start();
});

test('processingMode TriggerOnInput', (t) => {
  let pm = t.context.processingModule;
  let processingCB = sinon.fake((deltaT, inputs, outputs, state) => {
    t.true(deltaT !== undefined);
  });
  pm.setOnProcessing(processingCB);

  // trigger on every new input event
  pm.processingMode = {
    triggerOnInput: {}
  };
  pm.start();
  pm.inputs.forEach((element) => {
    pm.emit(ProcessingModule.EVENTS.NEW_INPUT, element.internalName);
  });
  t.is(processingCB.callCount, pm.inputs.length);
  pm.stop();

  // trigger only when all inputs are refreshed
  processingCB.resetHistory();
  pm.processingMode.triggerOnInput.allInputsNeedUpdate = true;
  pm.start();
  pm.inputs.forEach((element) => {
    pm.emit(ProcessingModule.EVENTS.NEW_INPUT, element.internalName);
  });
  t.is(processingCB.callCount, 1);
  pm.stop();
});

test('processingMode Lockstep', async (t) => {
  let pm = new ProcessingModule({
    processingMode: {
      lockstep: {}
    }
  });
  t.is(pm.onProcessingLockstepPass(), undefined);

  let lockstepDeltaTime = 10;
  let lockstepInputs = {},
    lockstepOutputs = {};
  let outputBool = true,
    outputInt = 42,
    outputString = 'string',
    outputObject = {};
  let processingCB = sinon.fake((deltaT, inputs, outputs, state) => {
    t.true(deltaT === lockstepDeltaTime);
    t.true(inputs === lockstepInputs);
    t.true(outputs === lockstepOutputs);
    t.true(state === pm.state);

    outputs.bool = outputBool;
    outputs.int = outputInt;
    outputs.string = outputString;
    outputs.object = outputObject;
  });
  pm.setOnProcessing(processingCB);
  pm.start();
  await pm.onProcessingLockstepPass(lockstepDeltaTime, lockstepInputs, lockstepOutputs);

  t.is(lockstepOutputs.bool, outputBool);
  t.is(lockstepOutputs.int, outputInt);
  t.is(lockstepOutputs.string, outputString);
  t.is(lockstepOutputs.object, outputObject);

  pm.stop();
  t.is(pm.onProcessingLockstepPass(), undefined);
});
