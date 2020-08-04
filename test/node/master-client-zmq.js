import test from 'ava';

const { MasterNode } = require('../../src/index');
const configService = require('../../src/config/configService');
const { ClientNodeZMQ } = require('../files/testNodes/clientNodeZMQ');

(function () {
  // Preparation:

  //TODO: rewrite so only one master node is necessary

  // Test cases:

  test.cb('register client', (t) => {
    configService.config.ports = {
      serviceZMQ: 8491,
      serviceREST: 8492,
      topicdataZMQ: 8493,
      topicdataWS: 8494
    };
    let master = new MasterNode();

    let client = new ClientNodeZMQ('clientName', 'localhost', 8491);

    client.initialize().then(() => {
      t.true(client.isInitialized());
      t.true(client.serviceClient !== undefined);
      t.true(master.clientManager.clients.size > 0);
      t.end();
    });
  });

  test.cb('register device', (t) => {
    configService.config.ports = {
      serviceZMQ: 8591,
      serviceREST: 8592,
      topicdataZMQ: 8593,
      topicdataWS: 8594
    };
    let master = new MasterNode();

    let client = new ClientNodeZMQ('clientName', 'localhost', 8591);

    client
      .initialize()
      .then(() => {
        return client.registerDevice('awesomeDeviceName', 0);
      })
      .then(() => {
        t.true(master.deviceManager.participants.size > 0);
        t.end();
      });
  });

  test.cb('publish', (t) => {
    configService.config.ports = {
      serviceZMQ: 8691,
      serviceREST: 8692,
      topicdataZMQ: 8693,
      topicdataWS: 8694
    };
    let master = new MasterNode();

    t.deepEqual(master.topicData.storage, {});

    let client = new ClientNodeZMQ('clientName', 'localhost', 8691);

    client
      .initialize()
      .then(() => {
        return client.registerDevice('anotherAwesomeDeviceName', 0);
      })
      .then(() => {
        client.publish('anotherAwesomeDeviceName', 'awesomeTopic', 'quaternion', {
          x: 129.1,
          y: 576.005,
          z: 100000.4,
          w: 79824678.78927348
        });
      })
      .then(() => {
        setTimeout(() => {
          t.true(master.topicData.storage['t:awesomeTopic:t'] !== undefined);
          t.end();
        }, 1000);
      });
  });

  test.cb('subscribe then', (t) => {
    configService.config.ports = {
      serviceZMQ: 8791,
      serviceREST: 8792,
      topicdataZMQ: 8793,
      topicdataWS: 8794
    };
    let master = new MasterNode();

    t.deepEqual(master.topicData.storage, {});

    let client = new ClientNodeZMQ('clientName', 'localhost', 8791);

    client
      .initialize()
      .then(() => {
        return client.registerDevice('anotherAwesomeDeviceName', 0);
      })
      .then(() => {
        return client.subscribeTopic('awesomeTopic');
      })
      .then(() => {
        t.true(master.topicData.storage['t:awesomeTopic:t'] !== undefined);
        t.end();
      });
  });

  test('subscribe await', async (t) => {
    configService.config.ports = {
      serviceZMQ: 8891,
      serviceREST: 8892,
      topicdataZMQ: 8893,
      topicdataWS: 8894
    };
    let master = new MasterNode();

    t.deepEqual(master.topicData.storage, {});

    let client = new ClientNodeZMQ('clientName', 'localhost', 8891);

    await client.initialize();
    await client.registerDevice('anotherAwesomeDeviceName', 0);
    await client.subscribeTopic('awesomeTopic');

    t.true(master.topicData.storage['t:awesomeTopic:t'] !== undefined);
  });

  test.cb('subscribe & publish', (t) => {
    configService.config.ports = {
      serviceZMQ: 8991,
      serviceREST: 8992,
      topicdataZMQ: 8993,
      topicdataWS: 8994
    };
    let master = new MasterNode();

    t.deepEqual(master.topicData.storage, {});

    let client1 = new ClientNodeZMQ('clientName2', 'localhost', 8991);
    let client2 = new ClientNodeZMQ('clientName', 'localhost', 8991);

    let quaternion = {
      x: 129.1,
      y: 576.005,
      z: 100000.4,
      w: 79824678.78927348
    };

    client1
      .initialize()
      .then(() => {
        return client1.registerDevice('anotherAwesomeDeviceName2', 0);
      })
      .then(() => {
        return client1.subscribeTopic('awesomeTopic', (message) => {
          t.is(message.x, quaternion.x);
          t.is(message.y, quaternion.y);
          t.is(message.z, quaternion.z);
          t.is(message.w, quaternion.w);
          t.true(master.topicData.storage['t:awesomeTopic:t'] !== undefined);
          t.end();
        });
      })
      .then(() => {
        return client2.initialize();
      })
      .then(() => {
        return client2.registerDevice('anotherAwesomeDeviceName', 0);
      })
      .then(() => {
        client2.publish('anotherAwesomeDeviceName', 'awesomeTopic', 'quaternion', quaternion);
      });
  });

  // todo:
  // multiple registrations with the same id
  // topicData of not registered devices/clients
})();
