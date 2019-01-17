import test from 'ava';
const {
  ClientManagerMock,
  DeviceManagerMock
} = require('./../mocks/serviceMocks');
const {
  ServiceManager
} = require('../../src/index');

(function () {
    // Preparation:

    test.beforeEach(t => {
      t.context.serviceManager = new ServiceManager(8777,
        new ClientManagerMock(true),
        new DeviceManagerMock(true));
    });

    // Test cases:

    test('addService', t => {
      let serviceCount = t.context.serviceManager.services.size;

      t.context.serviceManager.addService({
        topic: 'awesomeTopic'
      });

      t.true(t.context.serviceManager.services.size === serviceCount+1);
    });

    test('addService already registered', t => {
      let serviceCount = t.context.serviceManager.services.size;

      t.context.serviceManager.addService({
        topic: 'awesomeTopic'
      });

      t.notThrows(()=>{
        t.context.serviceManager.addService({
          topic: 'awesomeTopic'
        });
      });

      t.true(t.context.serviceManager.services.size === serviceCount+1);
    });

    test('removeService', t => {
      let serviceCount = t.context.serviceManager.services.size;

      t.context.serviceManager.addService({
        topic: 'awesomeTopic'
      });

      t.true(t.context.serviceManager.services.size === serviceCount+1);

      t.context.serviceManager.removeService('awesomeTopic');

      t.true(t.context.serviceManager.services.size === serviceCount);
    });

    test('getTopicList', t => {
      t.context.serviceManager.services = new Map();

      t.context.serviceManager.addService({
        topic: 'awesomeTopic'
      });

      t.deepEqual(['awesomeTopic'], t.context.serviceManager.getTopicList());
    });

    test('processRequest', t => {
      let passed = false;
      t.context.serviceManager.addService({
        topic: 'awesomeTopic',
        reply:()=>{
          passed=true;
        }
      });

      t.context.serviceManager.processRequest({
        type: 'awesomeTopic',
        awesomeTopic: {}
      });

      t.true(passed);
    });
})();