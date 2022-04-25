import test from 'ava';

import FilterUtils from '../../src/services/filterUtils';

(function () {
  // Preparation:

  /*test.beforeEach(t => {
      t.context.serviceManager = new ServiceManager(8777,
        new ClientManagerMock(true),
        new DeviceManagerMock(true));
    });*/

  // Test cases:

  test('first try', (t) => {
    let required = [
      {
        id: 'some-id',
        a: 123
      }
    ];
    let available = [
      {
        id: 'some-id',
        b: 123
      },
      {
        id: 'another-id',
        c: 123
      }
    ];

    let filtered = FilterUtils.filterAll(['id'], required, available);
    console.info(filtered);
    t.true(true);
  });
})();
