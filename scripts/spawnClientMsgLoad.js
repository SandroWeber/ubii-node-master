const { UbiiClientNode } = require('@tum-far/ubii-node-nodejs');
const { performance } = require('perf_hooks');

const PUBLISH_METHOD_NORMAL = 'normal';
const PUBLISH_METHOD_IMMEDIATELY = 'immediately';
const TEST_STATUS_UNMEASURED = 'unmeasured';
const TEST_STATUS_RUNNING = 'running';
const TEST_STATUS_STOPPED = 'stopped';
const TEST_STATUS_FINISHED = 'finished';

let config = {
  clientNode: {
    name: 'test-node-msg-load'
  },
  masterNode: {
    services: {
      mode: 'zmq',
      address: 'localhost:8101'
    },
    topicdata: {
      mode: 'zmq',
      address: 'localhost:8103'
    }
  }
};

let test = {
  status: TEST_STATUS_UNMEASURED,
  topic: undefined,
  timings: [],
  publishMethod: PUBLISH_METHOD_IMMEDIATELY,
  targetMessagesPerSecond: undefined,
  targetDurationMs: undefined
};

let ubiiNode = undefined;

(async function () {
  if (process.argv[2]) test.targetDurationMs = process.argv[2];
  if (process.argv[3]) test.targetMessagesPerSecond = process.argv[3];
  if (process.argv[4]) test.publishMethod = process.argv[4];

  ubiiNode = new UbiiClientNode(config.clientNode.name, config.masterNode.services, config.masterNode.topicdata);
  await ubiiNode.initialize();
  //console.log(`client node spawned (ID ${ubiiNode.id})`);

  process.on('message', function (message) {
    //console.log(`child process - Node ${ubiiNode.id} : ${message}`);

    if (message === 'START_TEST') {
      startTest();
    }
    if (message === 'STOP_TEST') {
      stopTest();
    }
  });
})();

let prepare = async () => {
  config.clientNode.id = ubiiNode.id;

  test.topic = ubiiNode.id + '/test/message_load';
  test.timings = [];
  test.numMessagesSent = 0;
  test.numMessagesReceived = 0;

  await ubiiNode.subscribeTopic(test.topic, onMessageReceived);
};

let startTest = async () => {
  if (test.status === TEST_STATUS_RUNNING) return;
  test.timeoutStopTest && clearTimeout(test.timeoutStopTest);

  await prepare();

  test.tTestStart = performance.now();
  let testDurationMs = parseInt(test.targetDurationMs);
  if (testDurationMs > 0) {
    test.timeoutStopTest = setTimeout(() => stopTest(), testDurationMs);
  }

  let messageIntervalMs = 1000 / parseInt(test.targetMessagesPerSecond);
  test.intervalSendMessage = setInterval(() => sendMessage(), messageIntervalMs);

  test.status = TEST_STATUS_RUNNING;

  //console.info('running test ...'); // eslint-disable-line no-console
  process.send('TEST_STARTED');
};

let stopTest = async () => {
  test.tTestStop = performance.now();
  test.intervalSendMessage && clearInterval(test.intervalSendMessage);

  test.status = TEST_STATUS_STOPPED;
  test.durationMs = test.tTestStop - test.tTestStart;

  let retriesAwaitingFinished = 0;
  let waitForMessages = () => {
    if (test.status === TEST_STATUS_STOPPED && test.numMessagesReceived === test.numMessagesSent) {
      finalizeTest();
    } else if (retriesAwaitingFinished < 5) {
      retriesAwaitingFinished++;
      setTimeout(waitForMessages, 500);
    } else {
      this.finalizeTest();
    }
  };
  waitForMessages();
};

let finalizeTest = () => {
  test.status = TEST_STATUS_FINISHED;
  test.actualMessagesPerSecond = (test.numMessagesReceived / (test.tTestStop - test.tTestStart)) * 1000;
  let rttSum = test.timings.reduce((partial_sum, a) => partial_sum + a);
  test.rttAvg = rttSum / test.timings.length;
  logTestResults();
};

/* min size = 8byte (timestamp) */
let sendMessage = () => {
  let record = {
    topic: test.topic,
    timestamp: {
      millis: Math.floor(performance.now())
    },
    string: ''
  };
  if (test.publishMethod === PUBLISH_METHOD_NORMAL) {
    ubiiNode.publishRecord(record);
  } else if (test.publishMethod === PUBLISH_METHOD_IMMEDIATELY) {
    ubiiNode.publishRecordImmediately(record);
  }
  test.numMessagesSent++;
};

let onMessageReceived = (record) => {
  //console.info(record);
  let tNow = performance.now();
  test.numMessagesReceived++;

  const timing = Math.floor(tNow) - record.timestamp.millis;
  test.timings.push(timing);
  if (typeof test.rttMin === 'undefined' || test.rttMin > timing) {
    test.rttMin = timing;
  }
  if (typeof test.rttMax === 'undefined' || test.rttMax < timing) {
    test.rttMax = timing;
  }
};

let logTestResults = () => {
  console.info({  // eslint-disable-line no-console
    id: ubiiNode.id,
    rttMin: test.rttMin,
    rttMax: test.rttMax,
    rttAvg: test.rttAvg,
    durationMs: test.durationMs,
    numMessagesSent: test.numMessagesSent,
    numMessagesReceived: test.numMessagesReceived,
    actualMessagesPerSecond: test.actualMessagesPerSecond
  })
}

module.exports = {
  CONSTANTS: {
    PUBLISH_METHOD_NORMAL: 'normal',
    PUBLISH_METHOD_IMMEDIATELY: 'immediately',
    TEST_STATUS_UNMEASURED: 'unmeasured',
    TEST_STATUS_RUNNING: 'running',
    TEST_STATUS_STOPPED: 'stopped',
    TEST_STATUS_FINISHED: 'finished'
  }
};
