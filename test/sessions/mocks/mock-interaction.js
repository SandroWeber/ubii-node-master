const uuidv4 = require('uuid/v4');
const sinon = require('../../node_modules/sinon/lib/sinon.js');


class MockInteraction {
  constructor() {
    this.id = uuidv4();

    this.process = sinon.fake();
  }


}

module.exports = MockInteraction;