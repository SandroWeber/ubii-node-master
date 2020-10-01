const EventEmitter = require('events');
const uuidv4 = require('uuid/v4');
const { proto } = require('@tum-far/ubii-msg-formats');
const ProcessingModuleProto = proto.ubii.processing.ProcessingModule;
const namida = require('@tum-far/namida');

const ExternalLibrariesService = require('../sessions/externalLibrariesService');

const Utils = require('../utilities');

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
      this.onCreated = Utils.createFunctionFromString(this.onCreatedStringified);
    }
    if (this.onProcessingStringified) {
      this.onProcessing = Utils.createFunctionFromString(this.onProcessingStringified);
    }
    if (this.onHaltedStringified) {
      this.onHalted = Utils.createFunctionFromString(this.onHaltedStringified);
    }
    if (this.onDestroyedStringified) {
      this.onDestroyed = Utils.createFunctionFromString(this.onDestroyedStringified);
    }

    this.status = ProcessingModuleProto.Status.CREATED;

    this.ioProxy = {};

    //TODO: refactor away from old "interactions" setup
    // only kept for backwards compatibility testing
    this.state = {};
    Object.defineProperty(this.state, 'modules', {
      // modules are read-only
      get: () => {
        return ExternalLibrariesService.getExternalLibraries();
      },
      configurable: true
    });
  }

  /* execution control */

  start() {
    this.status = ProcessingModuleProto.Status.PROCESSING;
    // processing based on frequency
    if (this.processingMode && this.processingMode.frequency) {
      this.startProcessingByFrequency();
    } else if (this.processingMode === undefined) {
      this.startProcessingByCycles();
    }
  }

  stop() {
    this.status = ProcessingModuleProto.Status.HALTED;
  }

  startProcessingByFrequency() {
    namida.log(this.toString(), 'start processing by frequency');
    let msFrequency = 1000 / this.processingMode.frequency.hertz;
    let processIteration = () => {
      this.onProcessing(this.ioProxy, this.ioProxy, this.state);
      if (this.status === ProcessingModuleProto.Status.PROCESSING) {
        setTimeout(() => {
          processIteration();
        }, msFrequency);
      }
    };
    processIteration();
  }

  startProcessingByTriggerOnInput() {
    namida.log(this.toString(), 'start processing triggered on input');
    this.on('new_input', () => {
      this.onProcessing(this.ioProxy, this.ioProxy, this.state);
    });
  }

  startProcessingByCycles() {
    namida.log(this.toString(), 'start processing by cycles with minimal delay');
    let processIteration = () => {
      this.onProcessing(this.ioProxy, this.ioProxy, this.state);
      if (this.status === ProcessingModuleProto.Status.PROCESSING) {
        setTimeout(() => {
          processIteration();
        }, 0);
      }
    };
    processIteration();
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
      this.toString(),
      'onProcessing callback is not specified, module will not do anything?'
    );
    throw new Error(this.toString() + ' - onProcessing() callback is not specified');
  }

  onHalted() {}

  onDestroyed() {}

  /* lifecycle functions end */

  /* I/O functions */

  setInputGetter(internalName, getter, overwrite = false) {
    // check internal naming is viable
    if (!this.checkInternalName(internalName, overwrite)) {
      return false;
    }

    // make sure getter is defined
    if (getter === undefined) {
      namida.error(
        this.toString(),
        'trying to set input getter for ' + internalName + ' but getter is undefined'
      );
      return false;
    }
    // make sure getter is a function
    if (typeof getter !== 'function') {
      namida.error(
        this.toString(),
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
        this.toString(),
        'trying to set output setter for ' + internalName + ' but setter is undefined'
      );
      return false;
    }
    // make sure setter is a function
    if (typeof setter !== 'function') {
      namida.error(
        this.toString(),
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
        this.toString(),
        'the internal I/O naming "' +
          internalName +
          '" should not be used as it conflicts with internal properties'
      );
      return false;
    }
    // case: we're not using an already defined name without specifying to overwrite
    if (this.ioProxy.hasOwnProperty(internalName) && !overwrite) {
      namida.error(
        this.toString(),
        'the internal I/O naming "' +
          internalName +
          '" is already defined (overwrite not specified)'
      );
      return false;
    }
    // case: the internal name is empty
    if (internalName === '') {
      namida.error(
        this.toString(),
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
    let ios = [...this.inputs, ...this.outputs];
    let io = ios.find((io) => {
      return io.internalName === name;
    });

    return io.messageFormat;
  }

  toString() {
    return 'ProcessingModule ' + this.name + ' (ID ' + this.id + ')';
  }

  /* helper functions end */
}

ProcessingModule.EVENTS = Object.freeze({
  NEW_INPUT: 1,
  PROCESSED: 2
});

module.exports = { ProcessingModule: ProcessingModule };