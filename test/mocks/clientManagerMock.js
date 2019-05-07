const sinon = require('sinon');

class ClientManagerMock {
    constructor() {
        this.getClient = sinon.fake();
    }
}

module.exports = {
    ClientManagerMock: ClientManagerMock,
}