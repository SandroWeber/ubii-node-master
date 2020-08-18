const EventEmitter = require('events');
const uuidv4 = require('uuid/v4');
const { proto, DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const ProcessingModuleProto = proto.ubii.processing.ProcessingModule;
const namida = require('@tum-far/namida/src/namida');

class ProcessingModule extends EventEmitter {
  constructor(
    specs = {
      id: uuidv4(),
      name: '',
      authors: [],
      tags: [],
      description: '',
      inputs: [],
      outputs: [],
      clientId: undefined,
      language: ProcessingModuleProto.Language.JS
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
  }

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

  hasInput(name) {
    return this.inputs.some((input) => {
      return input.internalName === name;
    });
  }

  getInput(name) {
    return this.inputs.find((input) => {
      input.internalName === name;
    });
  }

  hasOutput(name) {
    return this.outputs.some((output) => {
      return output.internalName === name;
    });
  }

  getOutput(name) {
    return this.outputs.find((output) => {
      return output.internalName === name;
    });
  }

  setInputGetter(internalName, getter, overwrite = false) {
    if (this.hasOwnProperty(internalName) && !overwrite) {
      namida.error(
        'ProcessingModule ' + this.toString(),
        'trying to set input getter for ' +
          internalName +
          ' but property is already defined (no overwrite)'
      );
      return false;
    }

    if (internalName === '') {
      namida.error(
        'ProcessingModule ' + this.toString(),
        'trying to set input getter for empty internal name ' + internalName
      );
      return false;
    }

    if (getter === undefined) {
      namida.error(
        'ProcessingModule ' + this.toString(),
        'trying to set input getter for ' + internalName + ' but getter is undefined'
      );
      return false;
    }

    if (typeof getter !== 'function') {
      namida.error(
        'ProcessingModule ' + this.toString(),
        'trying to set input getter for ' + internalName + ' but getter is not a function'
      );
      return false;
    }

    if (this[internalName]) {
      delete this[internalName];
    }
    // input is read-only
    Object.defineProperty(this, internalName, {
      get: () => {
        return getter();
      },
      configurable: true
    });

    return true;
  }

  removeInputGetter(internalName) {
    delete this[internalName];
  }

  setOutputSetter(internalName, setter, overwrite = false) {
    if (this.hasOwnProperty(internalName) && !overwrite) {
      namida.error(
        'ProcessingModule ' + this.toString(),
        'trying to set output setter for ' + internalName + ' but property is already defined'
      );
      return false;
    }

    if (internalName === '') {
      namida.error(
        'ProcessingModule ' + this.toString(),
        'trying to set output setter for empty internal name ' + internalName
      );
      return false;
    }

    if (setter === undefined) {
      namida.error(
        'ProcessingModule ' + this.toString(),
        'trying to set output setter for ' + internalName + ' but setter is undefined'
      );
      return false;
    }

    if (typeof setter !== 'function') {
      namida.error(
        'ProcessingModule ' + this.toString(),
        'trying to set output setter for ' + internalName + ' but setter is not a function'
      );
      return false;
    }

    if (this[internalName]) {
      delete this[internalName];
    }
    // output is write-only
    Object.defineProperty(this, internalName, {
      set: (value) => {
        setter(value);
      },
      configurable: true
    });

    return true;
  }

  removeOutputSetter(internalName) {
    delete this[internalName];
  }

  removeAllIOSettersGetters() {
    this.inputs.forEach((input) => {
      this.remoteInputGetter(input.internalName);
    });
    this.outputs.forEach((output) => {
      this.removeOutputSetter(output.internalName);
    });
  }
  /* I/O functions end */

  /* helper functions */

  toString() {
    return this.name + ' (ID ' + this.id + ')';
  }

  /* helper functions end */
}

module.exports = { ProcessingModule: ProcessingModule };
