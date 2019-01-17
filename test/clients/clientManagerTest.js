import test from 'ava';
import {
    ClientManager,
    Client
} from '../../src/index.js';
import {
    ServerMock,
    createClientSpecificationMock
} from '../mocks/serverMock.js';

(function () {

    // Helpers:

    let addDummiesToClientManager = function(context) {     
        context.clientManager.clients.set('00000000-0000-0000-0000-000000000000', {
            identifier: '00000000-0000-0000-0000-000000000000',
            deactivate: () => {}
        });
    };

    // Preparation:

    test.beforeEach(t => {
        t.context.serverMock = new ServerMock();
        t.context.clientManager = new ClientManager(t.context.serverMock, 'targetHost', '0000');
    })

    // Test cases:

    test('hasClient', t => {
        addDummiesToClientManager(t.context);

        t.true(t.context.clientManager.hasClient('00000000-0000-0000-0000-000000000000'));
    });

    test('verifyClient', t => {
        addDummiesToClientManager(t.context);

        t.true(t.context.clientManager.verifyClient('00000000-0000-0000-0000-000000000000'));
    });

    test('addClient', t => {
        t.context.clientManager.addClient({
            identifier: '00000000-0000-0000-0000-000000000000'
        });

        t.true(t.context.clientManager.clients.has('00000000-0000-0000-0000-000000000000'));
    });

    test('getClient', t => {
        let dummy = {
            identifier: 'dummyString',
        };
        t.context.clientManager.clients.set('00000000-0000-0000-0000-000000000000', dummy);

        let returnedClient = t.context.clientManager.getClient('00000000-0000-0000-0000-000000000000');

        t.deepEqual(dummy, returnedClient);
    });

    test('removeClient', t => {
        addDummiesToClientManager(t.context);

        t.context.clientManager.removeClient('00000000-0000-0000-0000-000000000000');

        t.true(!t.context.clientManager.clients.has('00000000-0000-0000-0000-000000000000'));
    });

    test('registerClient', t => {
        t.context.clientManager.registerClient({
            identifier: '00000000-0000-0000-0000-000000000000',
            startLifeMonitoring: () => {}
        });

        t.true(t.context.clientManager.clients.has('00000000-0000-0000-0000-000000000000'));
    });

    test('createClientUuid', t => {
        t.notThrows(()=>{
            t.context.clientManager.createClientUuid('awesomeNamespace');
        });
    });

    test('createClientSpecification', t => {
        t.notThrows(()=>{
            t.context.clientManager.createClientSpecification('identifier', 'name', 'namespace', 'targetHost', 'targetPort');
        });
    });

    test('createClientSpecificationWithNewUuid', t => {
        t.notThrows(()=>{
            t.context.clientManager.createClientSpecificationWithNewUuid('name', 'namespace', 'targetHost', 'targetPort');
        });
    });

    

    test('basic client operations', t => {
        t.notThrows(()=>{
            let dummyClient = new Client('00000000-0000-0000-0000-000000000000', 'clientDisplayName', 'awesomeNamespace', {})

            t.context.clientManager.addClient(dummyClient);

            t.true(t.context.clientManager.hasClient('00000000-0000-0000-0000-000000000000'));

            let returnedClient = t.context.clientManager.getClient('00000000-0000-0000-0000-000000000000');

            t.deepEqual(dummyClient, returnedClient);

            t.context.clientManager.removeClient('00000000-0000-0000-0000-000000000000');

            t.true(!t.context.clientManager.hasClient('00000000-0000-0000-0000-000000000000'));
        });
    });

    test('processClientRegistration', t => {
        let clientRegistration = createClientSpecificationMock('uniqueId');

        let result = t.context.clientManager.processClientRegistration(clientRegistration, {});

        t.is(result.error, undefined);
        t.is(result.clientSpecification.identifier, 'uniqueId');
    });

    test('processClientRegistration - double registration', t => {
        let clientRegistration = createClientSpecificationMock('uniqueId');

        t.context.clientManager.processClientRegistration(clientRegistration, {});
        let result = t.context.clientManager.processClientRegistration(clientRegistration, {});

        t.is(result.error.title, 'Client registration rejected');
        t.is(result.clientSpecification, undefined);
    });
})();