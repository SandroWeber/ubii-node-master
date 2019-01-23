import test from 'ava';
const {
    MasterNode
} = require('../../src/index.js');
const {
    RttTestNode
} = require('../files/testNodes/rttTestNode');
const namida = require('@tum-far/namida');

(function () {
    test.cb('multiple local topicData RoundTripTime', t => {
        let master = new MasterNode('localhost', 8699, 8700, 8701, 8702);

        let activeRttNodes = 5;

        namida.log('Local dealer/router round-trip time test',
        `Starting a local round-trip time (rtt) test with ${activeRttNodes} rttNodes...`);

        let onFinishCallback = () => {
            activeRttNodes = activeRttNodes - 1;
            if (activeRttNodes <= 0) {
                t.end();
            }
        }

        let rttNode0 = new RttTestNode('rttTest1', 'localhost', 8701, 'rtt0', onFinishCallback);
        let rttNode1 = new RttTestNode('rttTest2', 'localhost', 8701, 'rtt1', onFinishCallback);
        let rttNode2 = new RttTestNode('rttTest3', 'localhost', 8701, 'rtt2', onFinishCallback);
        let rttNode3 = new RttTestNode('rttTest4', 'localhost', 8701, 'rtt3', onFinishCallback);
        let rttNode4 = new RttTestNode('rttTest5', 'localhost', 8701, 'rtt4', onFinishCallback);

        rttNode0.initialize()
        .then(()=>{
            rttNode0.startRttMeasurement();
        });

        rttNode1.initialize()
        .then(()=>{
            rttNode1.startRttMeasurement();
        });

        rttNode2.initialize()
        .then(()=>{
            rttNode2.startRttMeasurement();
        });

        rttNode3.initialize()
        .then(()=>{
            rttNode3.startRttMeasurement();
        });

        rttNode4.initialize()
        .then(()=>{
            rttNode4.startRttMeasurement();
        });
    });
})();