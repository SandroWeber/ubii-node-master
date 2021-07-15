const { v4: uuidv4 } = require('uuid');
const MockProcessingModule = require('./mock-processing-module');

class MockIOMapping {
  constructor() {
    this.id = uuidv4();

    this.processingModule = new MockProcessingModule();
    this.mapInputs = new Map();
    this.mapOutputs = new Map();
  }
}

module.exports = { MockIOMapping: MockIOMapping };
