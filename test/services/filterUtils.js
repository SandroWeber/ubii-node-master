import test from 'ava';

import FilterUtils from '../../src/services/filterUtils';

const availableOptions = [
  { id: '123', name: 'object', tags: ['tag-1', 'tag-2', 'tag-3'], messageFormat: 'message.format.a', clientId: 'client-id-123', deviceId: 'device:id:123' },
  { id: '456', name: 'object', tags: ['tag-1', 'tag-2'], messageFormat: '', deviceId: 'device:id:123' },
  { id: '789', name: 'object 1', tags: ['tag-2', 'tag-3'], messageFormat: 'message.format.a' },
  { id: 'abcde', name: 'object 2', tags: ['tag-1'], messageFormat: 'message.format.b' },
  { id: 'fghij', tags: [], messageFormat: 'message.format.b', clientId: 'client-id-123', deviceId: 'device:id:456' },
  { name: 'object 3', clientId: 'client-id-456' },
  {}
];

(function () {
  // Preparation:

  /*test.beforeEach(t => {
      t.context.serviceManager = new ServiceManager(8777,
        new ClientManagerMock(true),
        new DeviceManagerMock(true));
    });*/

  // Test cases:

  test('filter by "id"', (t) => {
    let required = [
      {
        id: '123'
      }
    ];

    let filtered = FilterUtils.filterAll(['id'], required, availableOptions);
    t.is(filtered.length, 1);
    t.true(filtered.includes(availableOptions[0]));
  });

  test('filter by "name"', (t) => {
    let required = [
      {
        name: 'object'
      }
    ];

    let filtered = FilterUtils.filterAll(['name'], required, availableOptions);
    t.is(filtered.length, 2);
    t.true(filtered.includes(availableOptions[0]));
    t.true(filtered.includes(availableOptions[1]));
  });

  test('filter by "tags"', (t) => {
    let required = [
      {
        tags: ['tag-1']
      }
    ];

    let filtered = FilterUtils.filterAll(['tags'], required, availableOptions);
    t.is(filtered.length, 3);
    t.true(filtered.includes(availableOptions[0]));
    t.true(filtered.includes(availableOptions[1]));
    t.true(filtered.includes(availableOptions[3]));
  });

  test('filter by "messageFormat"', (t) => {
    let required = [
      {
        messageFormat: 'message.format.a'
      }
    ];

    let filtered = FilterUtils.filterAll(['messageFormat'], required, availableOptions);
    t.is(filtered.length, 2);
    t.true(filtered.includes(availableOptions[0]));
    t.true(filtered.includes(availableOptions[2]));
  });

  test('filter by "clientId"', (t) => {
    let required = [
      {
        clientId: 'client-id-456'
      }
    ];

    let filtered = FilterUtils.filterAll(['clientId'], required, availableOptions);
    t.is(filtered.length, 1);
    t.true(filtered.includes(availableOptions[5]));
  });

  test('filter by "deviceId"', (t) => {
    let required = [
      {
        deviceId: 'device:id:123'
      }
    ];

    let filtered = FilterUtils.filterAll(['deviceId'], required, availableOptions);
    t.is(filtered.length, 2);
    t.true(filtered.includes(availableOptions[0]));
    t.true(filtered.includes(availableOptions[1]));
  });

  test('filter by "name" and "tags"', (t) => {
    let required = [
      {
        name: 'object',
        tags: ['tag-1', 'tag-2']
      }
    ];

    let filtered = FilterUtils.filterAll(['name', 'tags'], required, availableOptions);
    t.is(filtered.length, 2);
    t.true(filtered.includes(availableOptions[0]));
    t.true(filtered.includes(availableOptions[1]));

    // tag-3 only
    required[0].tags = ['tag-3'];
    filtered = FilterUtils.filterAll(['name', 'tags'], required, availableOptions);
    t.is(filtered.length, 1);
    t.true(filtered.includes(availableOptions[0]));
  });

  test('filter by "messageFormat" or "tags" as alternatives', (t) => {
    let required = [
      {
        messageFormat: 'message.format.a',
      },
      {
        tags: ['tag-1']
      }
    ];

    let filtered = FilterUtils.filterAll(['messageFormat', 'tags'], required, availableOptions);
    t.is(filtered.length, 4);
    t.true(filtered.includes(availableOptions[0]));
    t.true(filtered.includes(availableOptions[1]));
    t.true(filtered.includes(availableOptions[2]));
    t.true(filtered.includes(availableOptions[3]));
  });
})();
