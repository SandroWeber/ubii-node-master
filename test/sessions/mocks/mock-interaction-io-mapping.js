const uuidv4 = require('uuid/v4');
const MockInteraction = require('./mock-interaction');


class MockInteractionIOMapping {
  constructor() {
    this.id = uuidv4();

    this.interaction = new MockInteraction();
    this.mapInputs = new Map();
    this.mapOutputs = new Map();
  }


}

module.exports = MockInteractionIOMapping;