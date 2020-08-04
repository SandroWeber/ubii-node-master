import test from 'ava';

const { MasterNode } = require('../../src/index.js');
const { ClientNodeWeb } = require('../files/testNodes/clientNodeWeb');
const configService = require('../../src/config/configService');

(function () {
  // Preparation:

  //TODO: rewrite so only one master node is necessary

  // Test cases:

  test.cb('register client', (t) => {
    configService.config.ports = {
      serviceZMQ: 9191,
      serviceREST: 9192,
      topicdataZMQ: 9193,
      topicdataWS: 9194
    };
    configService.config.https.enabled = false;
    let master = new MasterNode();

    let client = new ClientNodeWeb('clientName', 'localhost', 9192);

    client.initialize().then(() => {
      t.true(client.isInitialized());
      t.true(client.serviceClient !== undefined);
      t.true(master.clientManager.clients.size > 0);
      t.end();
    });
  });

  test.cb('register device', (t) => {
    configService.config.ports = {
      serviceZMQ: 9291,
      serviceREST: 9292,
      topicdataZMQ: 9293,
      topicdataWS: 9294
    };
    configService.config.https.enabled = false;
    let master = new MasterNode();

    let client = new ClientNodeWeb('clientName', 'localhost', 9292);

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
      serviceZMQ: 9391,
      serviceREST: 9392,
      topicdataZMQ: 9393,
      topicdataWS: 9394
    };
    configService.config.https.enabled = false;
    let master = new MasterNode();

    t.deepEqual(master.topicData.storage, {});

    let client = new ClientNodeWeb('clientName', 'localhost', 9392);

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
      serviceZMQ: 9491,
      serviceREST: 9492,
      topicdataZMQ: 9493,
      topicdataWS: 9494
    };
    configService.config.https.enabled = false;
    let master = new MasterNode();

    t.deepEqual(master.topicData.storage, {});

    let client = new ClientNodeWeb('clientName', 'localhost', 9492);

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
      serviceZMQ: 9591,
      serviceREST: 9592,
      topicdataZMQ: 9593,
      topicdataWS: 9594
    };
    configService.config.https.enabled = false;
    let master = new MasterNode();

    t.deepEqual(master.topicData.storage, {});

    let client = new ClientNodeWeb('clientName', 'localhost', 9592);

    await client.initialize();
    await client.registerDevice('anotherAwesomeDeviceName', 0);
    await client.subscribeTopic('awesomeTopic');

    t.true(master.topicData.storage['t:awesomeTopic:t'] !== undefined);
  });

  test.cb('subscribe & publish', (t) => {
    configService.config.ports = {
      serviceZMQ: 9691,
      serviceREST: 9692,
      topicdataZMQ: 9693,
      topicdataWS: 9694
    };
    configService.config.https.enabled = false;
    let master = new MasterNode();

    t.deepEqual(master.topicData.storage, {});

    let client1 = new ClientNodeWeb('clientName1', 'localhost', 9692);
    let client2 = new ClientNodeWeb('clientName2', 'localhost', 9692);

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
