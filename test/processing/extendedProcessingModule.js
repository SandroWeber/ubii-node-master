import test from 'ava';

import { ProcessingModule } from '../../src/index';

class ExtendedProcessingModule extends ProcessingModule {
  onCreated() {
    this.state = {
      counter: 0
    };
  }

  onProcessing() {
    this.state.counter++;
  }
}

/* run tests */

test('passing specifications to constructor', (t) => {
  let specs = {
    name: 'test-extended-pm',
    processingMode: {
      frequency: {
        hertz: 15
      }
    }
  };
  let module = new ExtendedProcessingModule(specs);
  t.is(module.name, specs.name);
  t.is(module.processingMode, specs.processingMode);
});

test('overwritten lifecycle functions', (t) => {
  let module = new ExtendedProcessingModule();
  module.onCreated();
  t.is(module.state.counter, 0);
  t.notThrows(() => {
    module.onProcessing();
  });
  t.is(module.state.counter, 1);
});
