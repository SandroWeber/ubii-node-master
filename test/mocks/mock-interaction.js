const uuidv4 = require('uuid/v4');
const sinon = require('sinon');


class MockInteraction {
  constructor() {
    this.id = uuidv4();

    this.process = sinon.fake();
  }


}

module.exports = {MockInteraction};