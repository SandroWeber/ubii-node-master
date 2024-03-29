import test from 'ava';
import { proto } from '@tum-far/ubii-msg-formats';

import { ClientManager, Client } from '../../src/index.js';
import { ServerMock, createClientSpecificationMock } from '../mocks/serverMock.js';

(function () {
  // Helpers:

  let addDummiesToClientManager = function (context) {
    context.clientManager.clients.set('00000000-0000-0000-0000-000000000000', {
      id: '00000000-0000-0000-0000-000000000000',
      deactivate: () => {}
    });
  };

  // Preparation:

  test.beforeEach((t) => {
    t.context.serverMock = new ServerMock();
    t.context.clientManager = ClientManager.instance.setDependencies(t.context.serverMock, undefined);
  });

  // Test cases:

  test('hasClient', (t) => {
    addDummiesToClientManager(t.context);

    t.true(t.context.clientManager.hasClient('00000000-0000-0000-0000-000000000000'));
  });

  test('verifyClient', (t) => {
    addDummiesToClientManager(t.context);

    t.true(t.context.clientManager.verifyClient('00000000-0000-0000-0000-000000000000'));
  });

  test('addClient', (t) => {
    t.context.clientManager.addClient({
      id: '00000000-0000-0000-0000-000000000000'
    });

    t.true(t.context.clientManager.clients.has('00000000-0000-0000-0000-000000000000'));
  });

  test('getClient', (t) => {
    let dummy = {
      id: 'dummyString'
    };
    t.context.clientManager.clients.set('00000000-0000-0000-0000-000000000000', dummy);

    let returnedClient = t.context.clientManager.getClient('00000000-0000-0000-0000-000000000000');

    t.deepEqual(dummy, returnedClient);
  });

  test('removeClient', (t) => {
    addDummiesToClientManager(t.context);

    t.context.clientManager.removeClient('00000000-0000-0000-0000-000000000000');

    t.true(!t.context.clientManager.clients.has('00000000-0000-0000-0000-000000000000'));
  });

  test('registerClient', (t) => {
    t.context.clientManager.registerClient({
      id: '00000000-0000-0000-0000-000000000000',
      startLifeMonitoring: () => {}
    });

    t.true(t.context.clientManager.clients.has('00000000-0000-0000-0000-000000000000'));
  });

  test('basic client operations', (t) => {
    t.notThrows(() => {
      let dummyClient = new Client({ name: 'clientDisplayName' }, {});

      t.context.clientManager.addClient(dummyClient);

      t.true(t.context.clientManager.hasClient(dummyClient.id));

      let returnedClient = t.context.clientManager.getClient(dummyClient.id);

      t.deepEqual(dummyClient, returnedClient);

      t.context.clientManager.removeClient(dummyClient.id);

      t.true(!t.context.clientManager.hasClient(dummyClient.id));
    });
  });

  test('processClientRegistration', (t) => {
    let clientSpecs = {
      name: 'test-name-processClientRegistration'
    };

    let result = t.context.clientManager.processClientRegistration(clientSpecs);

    t.true(result !== undefined);
    t.is(result.name, clientSpecs.name);
    // register again with same ID -> throws error
    clientSpecs.id = result.id;
    t.throws(() => {
      t.context.clientManager.processClientRegistration(clientSpecs);
    });
  });

  test('processClientRegistration - double registration', (t) => {
    let clientRegistration = createClientSpecificationMock('uniqueId');

    // first registration
    let client = t.context.clientManager.processClientRegistration(clientRegistration);
    t.not(client, undefined);
    // second registration
    client.state = proto.ubii.clients.Client.State.ACTIVE;
    t.throws(() => {
      result = t.context.clientManager.processClientRegistration(clientRegistration);
    });
  });
})();
