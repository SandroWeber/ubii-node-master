const sinon = require('sinon');

const {Session} = require('../../src/index');

class MockSession extends Session {
  constructor() {
    super();

    this.mock = true;

    this.start = sinon.fake();
    this.stop = sinon.fake();
    this.processInteractionsPromiseRecursive = sinon.fake();
    this.addInteraction = sinon.fake();
    this.removeInteraction = sinon.fake();
  }
}

module.exports = {MockSession};