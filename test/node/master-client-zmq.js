import test from 'ava';

const {MasterNode} = require('../../src/index');

const {ClientNodeZMQ} = require('../files/testNodes/clientNodeZMQ');

(function () {
  test.cb('register client', t => {
    let master = new MasterNode('localhost',
      8491,
      8492,
      8493,
      8494);

    let client = new ClientNodeZMQ('clientName',
      'localhost',
      8493,
      () => {
      },
      () => {
      });

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
      8591,
      8592,
      8593,
      8594);

    let client = new ClientNodeZMQ('clientName',
      'localhost',
      8593,
      () => {
      },
      () => {
      });

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
      8691,
      8692,
      8693,
      8694);

    t.deepEqual(master.topicData.storage, {});

    let client = new ClientNodeZMQ('clientName',
      'localhost',
      8693,
      () => {
      },
      () => {
      });

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
      8791,
      8792,
      8793,
      8794);

    t.deepEqual(master.topicData.storage, {});

    let client = new ClientNodeZMQ('clientName',
      'localhost',
      8793,
      () => {
      },
      () => {
      });

    client.initialize()
      .then(() => {
        return client.registerDevice('anotherAwesomeDeviceName', 0);
      })
      .then(() => {
        return client.subscribe('anotherAwesomeDeviceName', ['awesomeTopic'], []);
      })
      .then(() => {
        t.true(master.topicData.storage['t:awesomeTopic:t'] !== undefined);
        t.end();
      });
  });

  test('subscribe await', async t => {
    let master = new MasterNode('localhost',
      8891,
      8892,
      8893,
      8894);

    t.deepEqual(master.topicData.storage, {});

    let client = new ClientNodeZMQ('clientName',
      'localhost',
      8893,
      () => {
      },
      () => {
      });

    await client.initialize();
    await client.registerDevice('anotherAwesomeDeviceName', 0);
    await client.subscribe('anotherAwesomeDeviceName', ['awesomeTopic'], []);

    t.true(master.topicData.storage['t:awesomeTopic:t'] !== undefined);
  });

  test.cb('subscribe & publish', t => {
    let master = new MasterNode('localhost',
      8991,
      8992,
      8993,
      8994);

    t.deepEqual(master.topicData.storage, {});

    let client1 = new ClientNodeZMQ('clientName2',
      'localhost',
      8993,
      () => {
        t.true(master.topicData.storage['t:awesomeTopic:t'] !== undefined);
        t.end();
      },
      () => {
      });
    let client2 = new ClientNodeZMQ('clientName',
      'localhost',
      8993,
      () => {
      },
      () => {
      });

    client1.initialize()
      .then(() => {
        return client1.registerDevice('anotherAwesomeDeviceName2', 0);
      })
      .then(() => {
        return client1.subscribe('anotherAwesomeDeviceName2', ['awesomeTopic'], []);
      })
      .then(() => {
        return client2.initialize();
      })
      .then(() => {
        return client2.registerDevice('anotherAwesomeDeviceName', 0);
      })
      .then(() => {
        client2.publish('anotherAwesomeDeviceName', 'awesomeTopic', 'quaternion', {
          x: 129.1,
          y: 576.005,
          z: 100000.4,
          w: 79824678.78927348
        });
      });
    ;
  });

  // todo:
  // multiple registrations with the same id
  // topicData of not registered devices/clients
})();