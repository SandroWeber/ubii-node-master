import test from 'ava';
const {
  DeviceManagerMock
} = require('../mocks/mocks.js');
const {
  SubscribtionService
} = require('../src/services/subscribtionService.js');

(function () {

    // Preparation:

    test.beforeEach(t => {
      t.context.deviceManagerMock = new DeviceManagerMock(true);
    });

    // Test cases:

    test('create', t => {
      t.notThrows(()=>{
        let subscribtionService = new SubscribtionService(
          t.context.deviceManagerMock);
      });
    });

    test('reply', t => {
      let subscribtionService = new SubscribtionService(
        t.context.deviceManagerMock);

        subscribtionService.reply({
        subscribeTopics: ['1'],
        unsubscribeTopics: ['1']
    });

      t.is(subscribtionService.deviceManager.verifyParticipantCounter, 1);
      t.is(subscribtionService.deviceManager.getParticipantCounter, 1);
    });
})();