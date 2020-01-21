const sinon = require('sinon');

//TODO: merge servermocks

/**
 * Mock for the message transport server dependency.
 */
class ServerMock {
    constructor() {
        this.send = sinon.fake(() => {
            this.sendCounter++;
        });
        this.sendCounter = 0;

        this.ping = sinon.fake(() => {
            this.pingCounter++;
        });
        this.pingCounter = 0;
    }
}

/**
 * Client specification mock with a dummy structure as defined in the message formats repository.
 * @param {String} identifier 
 */
let createClientSpecificationMock = function (identifier) {
    return {
        id: identifier,
        name: 'clientMock',
        namespace: '',
        targetHost: 'targetHost',
        targetPort: '0000'
    };
}

module.exports = {
    ServerMock: ServerMock,
    createClientSpecificationMock: createClientSpecificationMock
}