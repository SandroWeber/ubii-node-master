import test from 'ava';
import {
    Client
} from '../../src/index.js';

(function () {

    // Helpers:

    // Preparation:

    test.beforeEach(t => {
    })

    // Test cases:

    test('client construction', t => {
        t.notThrows(()=>{
            let client = new Client('00000000-0000-0000-0000-000000000000', 'clientName', 'awesoemNamespace', {});
        });
      });
})();