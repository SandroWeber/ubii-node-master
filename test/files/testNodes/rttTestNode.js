const {
    ClientNodeZMQ
} = require('./clientNodeZMQ.js');
const {
    defaultServiceServerPort
} = require('../../../src/node/constants');
const {
    ZmqDealer
} = require('@tum-far/ubii-msg-transport');
const namida = require('@tum-far/namida');

const numberOfIterations = 500;
const timeBetweenIterations = 60; // in ms

class RttTestNode extends ClientNodeZMQ {
    constructor(name, serviceHost = 'localhost', servicePort = defaultServiceServerPort, topic, onFinishedCallback) {
        let currentIteration = 0;
        let average = [0.0, 0.0];

        super(name, serviceHost, servicePort, (message) => {
            let time = process.hrtime();
            let repTime = JSON.parse(`[ ${message.topicDataRecord[message.topicDataRecord.type].toString()}]`);
            let results = [];

            // calculate delta time, add measurement to the result array and increase iteration counter
            let deltaTime = [Math.abs(repTime[0] - time[0]), Math.abs(repTime[1] - time[1])];
            results.push(deltaTime);
            currentIteration += 1;

            // End of rtt measurement. Calculate the result and output it.
            if (currentIteration === numberOfIterations) {
                let i, il = results.length;
                for (i = 0; i < il; i++) {
                    average[0] += results[i][0];
                    average[1] += results[i][1];
                }

                average[0] /= il;
                average[1] /= il;

                let averageInS = (average[0] + (average[1] / 1000000000)).toFixed(5);
                namida.logSuccess('Local dealer/router round-trip time test result',
                    `Average rtt after ${currentIteration} `+
                    `iterations: ${averageInS} s ( ~${(1 / averageInS).toFixed(2)} rounds per second )`);

                if(typeof onFinishedCallback === 'function'){
                    onFinishedCallback();
                }
            }
        }, (message) => {
        });

        this.defaultDeviceName = 'DefaultDeviceName';
        this.rttTopic = topic;      
    }

    async startRttMeasurement(){
        // Register the default device.
        await this.registerDevice(this.defaultDeviceName, 1);

        // Subscribe to the rtt topic.
        await this.subscribe(this.defaultDeviceName, [this.rttTopic], []);

        // Start the rtt measurement.
        namida.log('Local dealer/router round-trip time test started',
            'Starting local round-trip time (rtt) measurement...');

        // Publish data with the current process time i times every x ms.
        for (var i = 0; i < numberOfIterations; i++) {
            setTimeout(() => {
                this.publish(this.defaultDeviceName, this.rttTopic, 'string', process.hrtime().toString());
            }, timeBetweenIterations * i)
        }
    }
}

module.exports = {
    'RttTestNode': RttTestNode,
}