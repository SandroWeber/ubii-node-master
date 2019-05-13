const sinon = require('sinon');

class ClientMock {
    constructor() {
        this.sendMessageToRemote = sinon.fake();
    }
}

module.exports = {
    ClientMock: ClientMock,
}