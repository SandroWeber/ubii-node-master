const EventEmitter = require('events');
const uuidv4 = require('uuid/v4');
const { proto, DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const ProcessingModuleProto = proto.ubii.processing.ProcessingModule;
const ProcessingMode = proto.ubii.processing.ProcessingMode;
const namida = require('@tum-far/namida/src/namida');

class ProcessingModule extends EventEmitter {
  constructor(
    specs = {
      id: uuidv4(),
      name: '',
      authors: [],
      tags: [],
      description: '',
      clientId: undefined,
      language: ProcessingModuleProto.Language.JS,
      inputs: [],
      outputs: [],
      processingMode: {
        frequency: {
          hertz: 30
        }
      },
      onCreatedStringified: undefined,
      onProcessingStringified: undefined,
      onHaltedStringified: undefined,
      onDestroyedStringified: undefined
    }
  ) {
    super();

    // check that language specification for module is correct
    if (specs.language === undefined) specs.language = ProcessingModuleProto.Language.JS;
    if (specs.language !== ProcessingModuleProto.Language.JS) {
      namida.error(
        'ProcessingModule ' + this.toString(),
        'trying to create module under javascript, but specification says ' +
          ProcessingModuleProto.Language[specs.language]
      );
      throw new Error(
        'Incompatible language specifications (javascript vs. ' +
          ProcessingModuleProto.Language[specs.language] +
          ')'
      );
    }

    // take over specs and add ID if missing
    Object.assign(this, specs);
    if (!this.id) {
      this.id = uuidv4();
    }

    if (this.onCreatedStringified) {
      this.onCreated = Utils.createFunctionFromString(onCreatedStringified);
    }
    if (this.onProcessingStringified) {
      this.onProcessing = Utils.createFunctionFromString(onProcessingStringified);
    }
    if (this.onHaltedStringified) {
      this.onHalted = Utils.createFunctionFromString(onHaltedStringified);
    }
    if (this.onDestroyedStringified) {
      this.onDestroyed = Utils.createFunctionFromString(onDestroyedStringified);
    }

    this.status = ProcessingModuleProto.Status.CREATED;

    this.ioProxy = {};
  }

  /* execution control */

  start() {
    this.status = ProcessingModuleProto.Status.PROCESSING;
    // processing based on frequency
    if (this.processingMode.frequency) {
      processByFrequency();
    }
  }

  processByFrequency() {
    let msFrequency = 1000 / this.processingMode.frequency.hertz;
    let processIteration = () => {
      this.onProcessing(this.ioProxy, this.state);
      if (this.status === ProcessingModuleProto.Status.PROCESSING) {
        setTimeout(() => {
          this.processByFrequency();
        }, msFrequency);
      }
    };
    processIteration();
  }

  processByTriggerOnInput() {
    this.on('new_input', () => {
      this.onProcessing(this.ioProxy, this.state);
    });
  }

  /* execution control end */

  /* lifecycle functions */

  setOnCreated(callback) {
    this.onCreated = callback;
  }

  setOnProcessing(callback) {
    this.onProcessing = callback;
  }

  setOnHalted(callback) {
    this.onHalted = callback;
  }

  setOnDestroyed(callback) {
    this.onDestroyed = callback;
  }

  onCreated() {}

  /**
   * Lifecycle function to be called when module is supposed to process data.
   * Needs to be overwritten when extending this class, specified as a stringified version for the constructor or
   * set via setOnProcessing() before onProcessing() is called.
   * Signature
   */
  onProcessing() {
    namida.error(
      'ProcessingModule ' + this.toString(),
      'onProcessing callback is not specified, module will not do anything?'
    );
    throw new Error(
      'ProcessingModule ' + this.toString() + ' - onProcessing() callback is not specified'
    );
  }

  onHalted() {}

  onDestroyed() {}

  /* lifecycle functions end*/

  /* I/O functions */

  setInputGetter(internalName, getter, overwrite = false) {
    // check internal naming is viable
    if (!this.checkInternalName(internalName, overwrite)) {
      return false;
    }

    // make sure getter is defined
    if (getter === undefined) {
      namida.error(
        'ProcessingModule ' + this.toString(),
        'trying to set input getter for ' + internalName + ' but getter is undefined'
      );
      return false;
    }
    // make sure getter is a function
    if (typeof getter !== 'function') {
      namida.error(
        'ProcessingModule ' + this.toString(),
        'trying to set input getter for ' + internalName + ' but getter is not a function'
      );
      return false;
    }

    // make sure we're clean
    this.removeIOAccessor(internalName);
    // define getter for both ioProxy and module itself (as shortcut), input is read-only
    [this.ioProxy, this].forEach((object) => {
      Object.defineProperty(object, internalName, {
        get: () => {
          return getter();
        },
        configurable: true,
        enumerable: true
      });
    });

    return true;
  }

  setOutputSetter(internalName, setter, overwrite = false) {
    // check internal naming is viable
    if (!this.checkInternalName(internalName, overwrite)) {
      return false;
    }

    // make sure setter is defined
    if (setter === undefined) {
      namida.error(
        'ProcessingModule ' + this.toString(),
        'trying to set output setter for ' + internalName + ' but setter is undefined'
      );
      return false;
    }
    // make sure setter is a function
    if (typeof setter !== 'function') {
      namida.error(
        'ProcessingModule ' + this.toString(),
        'trying to set output setter for ' + internalName + ' but setter is not a function'
      );
      return false;
    }

    // make sure we're clean
    this.removeIOAccessor(internalName);
    // define setter for both ioProxy and module itself (as shortcut), output is write-only
    [this.ioProxy, this].forEach((object) => {
      Object.defineProperty(object, internalName, {
        set: (value) => {
          setter(value);
        },
        configurable: true,
        enumerable: true
      });
    });

    return true;
  }

  removeIOAccessor(internalName) {
    if (this.ioProxy.hasOwnProperty(internalName)) {
      delete this.ioProxy[internalName];
      delete this[internalName];
    }
  }

  removeAllIOAccessors() {
    for (let key in this.ioProxy) {
      this.removeIOAccessor(key);
    }
  }

  checkInternalName(internalName, overwrite = false) {
    // case: name that is a property of this class and explicitly not an otherwise viable internal name
    // and should therefore never be overwritten
    if (this.hasOwnProperty(internalName) && !this.ioProxy.hasOwnProperty(internalName)) {
      namida.error(
        'ProcessingModule ' + this.toString(),
        'the internal I/O naming "' +
          internalName +
          '" should not be used as it conflicts with internal properties'
      );
      return false;
    }
    // case: we're not using an already defined name without specifying to overwrite
    if (this.ioProxy.hasOwnProperty(internalName) && !overwrite) {
      namida.error(
        'ProcessingModule ' + this.toString(),
        'the internal I/O naming "' +
          internalName +
          '" is already defined (overwrite not specified)'
      );
      return false;
    }
    // case: the internal name is empty
    if (internalName === '') {
      namida.error(
        'ProcessingModule ' + this.toString(),
        'the internal I/O naming "' + internalName + '" can\'t be used (empty)'
      );
      return false;
    }

    return true;
  }

  readInput(name) {
    return this.ioProxy[name];
  }

  writeOutput(name, value) {
    this.ioProxy[name] = value;
  }

  /* I/O functions end */

  /* helper functions */

  getIOMessageFormat(name) {
    return [...this.inputs, ...this.outputs].find((input) => {
      return input.internalName === name;
    }).messageFormat;
  }

  toString() {
    return this.name + ' (ID ' + this.id + ')';
  }

  /* helper functions end */
}

ProcessingModule.EVENTS = Object.freeze({
  NEW_INPUT: 1,
  PROCESSED: 2,
  wednesday: 3
});

module.exports = { ProcessingModule: ProcessingModule };
