const sinon = require('sinon');

class MockProcessingModuleManager {
  constructor() {
    this.hasModuleID = sinon.fake();
    this.addModule = sinon.fake();
    this.applyIOMappings = sinon.fake();
    this.removeModule = sinon.fake();
  }
}

module.exports = { MockProcessingModuleManager: MockProcessingModuleManager };
