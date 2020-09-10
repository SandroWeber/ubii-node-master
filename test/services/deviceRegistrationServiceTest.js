import test from 'ava';
const { ClientManagerMock, DeviceManagerMock } = require('../mocks/serviceMocks');
const { DeviceRegistrationService } = require('../../src/index');

(function () {
  // Preparation:

  test.beforeEach((t) => {
    t.context.clientManagerMock = new ClientManagerMock(true);
    t.context.deviceManagerMock = new DeviceManagerMock(true);
  });

  // Test cases:

  test('create', (t) => {
    t.notThrows(() => {
      let deviceRegistrationService = new DeviceRegistrationService(
        t.context.clientManagerMock,
        t.context.deviceManagerMock
      );
    });
  });

  test('reply', (t) => {
    let deviceRegistrationService = new DeviceRegistrationService(
      t.context.clientManagerMock,
      t.context.deviceManagerMock
    );

    deviceRegistrationService.reply({});

    t.is(deviceRegistrationService.clientManager.verifyClientCounter, 1);
    t.is(deviceRegistrationService.deviceManager.createDeviceSpecificationWithNewUuidCounter, 1);
    t.is(deviceRegistrationService.deviceManager.processDeviceRegistrationCounter, 1);
  });
})();
