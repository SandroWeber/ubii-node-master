//TODO: refactor into properly named files

class ClientManagerMock {
  constructor(verifyEverything) {
    this.verifyEverything = verifyEverything;

    this.createClientSpecificationWithNewUuidCounter = 0;
    this.processClientRegistrationCounter = 0;
    this.verifyClientCounter = 0;
  }
  createClientSpecificationWithNewUuid() {
    this.createClientSpecificationWithNewUuidCounter++;
    return {};
  }

  processClientRegistration() {
    this.processClientRegistrationCounter++;
    return {};
  }

  verifyClient() {
    this.verifyClientCounter++;

    return this.verifyEverything;
  }
}

class DeviceManagerMock {
  constructor(verifyEverything) {
    this.verifyEverything = verifyEverything;

    this.createDeviceSpecificationWithNewUuidCounter = 0;
    this.processDeviceRegistrationCounter = 0;
    this.verifyParticipantCounter = 0;
    this.getParticipantCounter = 0;
  }
  createDeviceSpecificationWithNewUuid() {
    this.createDeviceSpecificationWithNewUuidCounter++;
    return {};
  }

  registerDeviceSpecs() {
    this.processDeviceRegistrationCounter++;
    return {};
  }

  verifyParticipant() {
    this.verifyParticipantCounter++;

    return this.verifyEverything;
  }

  getParticipant() {
    this.getParticipantCounter++;

    return {
      updateLastSignOfLife: () => {},
      subscribe: () => {},
      unsubscribe: () => {}
    };
  }
}

let createClientSpecificationMock = function (id) {
  return {
    id: id,
    name: 'clientMock',
    namespace: '',
    targetHost: 'targetHost',
    targetPort: '0000'
  };
};

module.exports = {
  ClientManagerMock: ClientManagerMock,
  DeviceManagerMock: DeviceManagerMock,
  createClientSpecificationMock: createClientSpecificationMock
};
