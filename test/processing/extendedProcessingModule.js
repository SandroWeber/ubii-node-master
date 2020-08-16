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

test('extending ProcessingModule and overwriting lifecycle functions', (t) => {
  let module = new ExtendedProcessingModule();
  module.onCreated();
  t.is(module.state.counter, 0);
  t.notThrows(() => {
    module.onProcessing();
  });
  t.is(module.state.counter, 1);
});
