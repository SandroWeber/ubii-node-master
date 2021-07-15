const { v4: uuidv4 } = require('uuid');
const sinon = require('sinon');

class MockProcessingModule {
  constructor() {
    this.id = uuidv4();

    this.onCreated = sinon.fake();
    this.onProcessing = sinon.fake();
    this.start = sinon.fake();
    this.stop = sinon.fake();
  }
}

module.exports = MockProcessingModule;
