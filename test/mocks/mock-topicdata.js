const sinon = require('sinon');

class MockTopicData {
    constructor() {
        this.pull = sinon.fake();
        this.publish = sinon.fake();
    }
}

module.exports = MockTopicData;