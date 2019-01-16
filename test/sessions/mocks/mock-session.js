const uid = require('uid');
const sinon = require('../../node_modules/sinon/lib/sinon.js');

const Session = require('../../src/js/session.js');

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

module.exports = MockSession;