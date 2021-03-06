const sinon = require('sinon');

/**
 * Mock for the message transport server dependency.
 */
class ServerMock {
  constructor() {
    this.send = sinon.fake();
    this.ping = sinon.fake();
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
};

module.exports = {
  ServerMock: ServerMock,
  createClientSpecificationMock: createClientSpecificationMock
};
