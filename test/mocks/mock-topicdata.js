const sinon = require('sinon');

class MockTopicData {
    constructor() {
        this.pull = sinon.fake();
        this.publish = sinon.fake();
        this.events = {
            addListener: sinon.fake(),
            removeListener: sinon.fake()
        };
        this.getAllTopicsWithData = sinon.fake();
    }
}

module.exports = MockTopicData;