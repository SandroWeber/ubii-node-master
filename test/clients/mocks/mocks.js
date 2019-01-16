/**
 * Mock for the message transport server dependency.
 */
class ServerMock {
    constructor() {
        this.send = () => {
            this.sendCounter++;
        };
        this.sendCounter = 0;

        this.ping = () => {
            this.pingCounter++;
        };
        this.pingCounter = 0;
    }
}

/**
 * Client specification mock with a dummy structure as defined in the message formats repository.
 * @param {String} identifier 
 */
let createClientSpecificationMock = function(identifier){
    return {
        identifier: identifier,
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