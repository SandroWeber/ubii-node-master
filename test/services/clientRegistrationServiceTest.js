import test from 'ava';
const {
  ClientManagerMock
} = require('../mocks/mocks.js');
const {
  ClientRegistrationService
} = require('../src/services/clientRegistrationService.js');

(function () {

    // Preparation:

    test.beforeEach(t => {
      t.context.clientManagerMock = new ClientManagerMock(true);
    });

    // Test cases:

    test('create', t => {
      t.notThrows(()=>{
        let clientRegistrationService = new ClientRegistrationService(
          t.context.clientManagerMock,
          'topicDataHost',
          'topicDataPort');
      });
    });

    test('reply', t => {
      let clientRegistrationService = new ClientRegistrationService(
        t.context.clientManagerMock,
        'topicDataHost',
        'topicDataPort');

        clientRegistrationService.reply({});

      t.is(clientRegistrationService.clientManager.createClientSpecificationWithNewUuidCounter, 1);
      t.is(clientRegistrationService.clientManager.processClientRegistrationCounter, 1);
    });
})();