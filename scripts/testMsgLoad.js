//const { UbiiClientNode } = require('@tum-far/ubii-node-nodejs');

/*const workerpool = require('workerpool');
const pool = workerpool.pool();

function spawnClient() {

}*/

const { fork } = require('child_process');
const { CONSTANTS } = require('./spawnClientMsgLoad');

let config = {
  numClientNodes: 1,
  targetMsgsPerSecond: 1000,
  msgPayloadBytes: 0,
  testDurationMs: 0,
  publishMethod: CONSTANTS.PUBLISH_METHOD_BUNDLED
};

let childProcesses = [];

(async function () {
  if (process.argv[2] === '--help') {
    console.log(
      `USAGE PARAMS:\n` +
        `#1 num clients (default=${config.numClientNodes})\n` +
        `#2 target msgs/s per client (default=${config.targetMsgsPerSecond})\n` +
        `#3 msg payload size (bytes, default=${config.msgPayloadBytes})\n` +
        `#4 test runtime (ms, 0=infinite, default=${config.testDurationMs})\n` +
        `#5 publish method (${CONSTANTS.PUBLISH_METHOD_IMMEDIATELY} | ${CONSTANTS.PUBLISH_METHOD_BUNDLED}, default=${config.publishMethod})\n`
    );

    process.exit(0);
  }

  if (process.argv[2]) config.numClientNodes = parseInt(process.argv[2], 10);
  if (process.argv[3]) config.targetMsgsPerSecond = parseInt(process.argv[3], 10);
  if (process.argv[4]) config.msgPayloadBytes = parseInt(process.argv[4], 10);
  if (process.argv[5]) config.testDurationMs = parseInt(process.argv[5], 10);
  if (process.argv[6]) config.publishMethod = process.argv[6];
  console.info(config);

  for (let i = 0; i < config.numClientNodes; i++) {
    //console.log('Forking a new subprocess....');
    const child = fork('scripts/spawnClientMsgLoad.js', [
      config.targetMsgsPerSecond,
      config.msgPayloadBytes,
      config.testDurationMs,
      config.publishMethod
    ]);
    child.on('close', function (code) {
      console.log('child process exited with code ' + code);
    });
    child.on('message', function (message) {
      //console.log(`main process - message from child: ${message}`);
    });

    child.send('START_TEST');
    childProcesses.push(child);

    // stretch out spawning of nodes as to not overload master node
    if (i % 10 === 0) {
      await new Promise((resolve) => {
        setTimeout(resolve, 5000);
      });
    }
  }
})();

/*(async function () {
  console.info(process.argv);
  console.info('byte length of "s": ' + Buffer.byteLength('s', 'utf8'));
  console.info('byte length of "string": ' + Buffer.byteLength('string', 'utf8'));

  if (process.argv[2] === 'child') {
    setTimeout(() => {
      console.log(`Hello from ${process.argv[2]}!`);
    }, 1_000);
  } else {
    const controller = new AbortController();
    const { signal } = controller;
    const child = fork(__filename, ['child'], { signal });
    child.on('error', (err) => {
      // This will be called with err being an AbortError if the controller aborts
    });
    controller.abort(); // Stops the child process
  }
})();*/

/*const ls = exec('ls -l', function (error, stdout, stderr) {
  if (error) {
    console.log(error.stack);
    console.log('Error code: ' + error.code);
    console.log('Signal received: ' + error.signal);
  }
  console.log('Child Process STDOUT: ' + stdout);
  console.log('Child Process STDERR: ' + stderr);
});

ls.on('exit', function (code) {
  console.log('Child process exited with exit code ' + code);
});*/

/*(async function () {
  let ubiiNode = new UbiiClientNode('test-node-nodejs', config.masterNode.services, config.masterNode.topicdata);
  await ubiiNode.initialize();
})();*/
