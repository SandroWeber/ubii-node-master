import test from 'ava';

const {MasterNode} = require('../../src/index.js');

const {ClientNodeWeb} = require('../files/testNodes/clientNodeWeb');

(function () {
  test.cb('register client', t => {
    let master = new MasterNode('localhost',
      9191,
      9192,
      9193,
      9194);

    let client = new ClientNodeWeb('clientName',
      'localhost',
      9194);

    client.initialize()
      .then(() => {
        t.true(client.isInitialized());
        t.true(client.serviceClient !== undefined);
        t.true(master.clientManager.clients.size > 0);
        t.end();
      });
  });

  test.cb('register device', t => {
    let master = new MasterNode('localhost',
      9291,
      9292,
      9293,
      9294);

    let client = new ClientNodeWeb('clientName',
      'localhost',
      9294);

    client.initialize()
      .then(() => {
        return client.registerDevice('awesomeDeviceName', 0);
      })
      .then(() => {
        t.true(master.deviceManager.participants.size > 0);
        t.end();
      });
  });

  test.cb('publish', t => {
    let master = new MasterNode('localhost',
      9391,
      9392,
      9393,
      9394);

    t.deepEqual(master.topicData.storage, {});

    let client = new ClientNodeWeb('clientName',
      'localhost',
      9394);

    let deviceID;
    client.initialize()
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

  test.cb('subscribe then', t => {
    let master = new MasterNode('localhost',
      9491,
      9492,
      9493,
      9494);

    t.deepEqual(master.topicData.storage, {});

    let client = new ClientNodeWeb('clientName',
      'localhost',
      9494);

    client.initialize()
      .then(() => {
        return client.registerDevice('anotherAwesomeDeviceName', 0);
      })
      .then(() => {
        return client.subscribe('awesomeTopic');
      })
      .then(() => {
        t.true(master.topicData.storage['t:awesomeTopic:t'] !== undefined);
        t.end();
      });
  });

  test('subscribe await', async t => {
    let master = new MasterNode('localhost',
      9591,
      9592,
      9593,
      9594);

    t.deepEqual(master.topicData.storage, {});

    let client = new ClientNodeWeb('clientName',
      'localhost',
      9594);

    await client.initialize();
    await client.registerDevice('anotherAwesomeDeviceName', 0);
    await client.subscribe('awesomeTopic');

    t.true(master.topicData.storage['t:awesomeTopic:t'] !== undefined);
  });

  test.cb('subscribe & publish', t => {
    let master = new MasterNode('localhost',
      9691,
      9692,
      9693,
      9694);

    t.deepEqual(master.topicData.storage, {});

    let client1 = new ClientNodeWeb('clientName1',
      'localhost',
      9694);
    /*client1.onTopicDataMessageReceived = (message) => {
      t.true(master.topicData.storage['t:awesomeTopic:t'] !== undefined);
      t.end();
    };*/
    let client2 = new ClientNodeWeb('clientName2',
      'localhost',
      9694);

    let quaternion = {
      x: 129.1,
      y: 576.005,
      z: 100000.4,
      w: 79824678.78927348
    };

    client1.initialize()
      .then(() => {
        return client1.registerDevice('anotherAwesomeDeviceName2', 0);
      })
      .then(() => {
        return client1.subscribe('awesomeTopic', (message) => {
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