//const { UbiiClientNode } = require('@tum-far/ubii-node-nodejs');

/*const workerpool = require('workerpool');
const pool = workerpool.pool();

function spawnClient() {

}*/

const { fork } = require('child_process');
const { CONSTANTS } = require('./spawnClientMsgLoad');

let config = {
  numClientNodes: 1,
  testDurationMs: 0,
  targetMsgsPerSecond: 1000,
  publishMethod: CONSTANTS.PUBLISH_METHOD_IMMEDIATELY
};

let childProcesses = [];

(async function () {
  console.log(
    `USAGE PARAMS:\n#1 num clients (default=${config.numClientNodes})\n` +
      `#2 test runtime (ms, default=${config.testDurationMs})\n` +
      `#3 target msgs/s (default=${config.targetMsgsPerSecond})\n` +
      `#4 publish method (${CONSTANTS.PUBLISH_METHOD_IMMEDIATELY} | ${CONSTANTS.PUBLISH_METHOD_NORMAL}, default=${config.publishMethod})\n`
  );
  if (process.argv[2]) config.numClientNodes = process.argv[2];
  if (process.argv[3]) config.testDurationMs = process.argv[3];
  if (process.argv[4]) config.targetMsgsPerSecond = process.argv[4];
  if (process.argv[5]) config.publishMethod = process.argv[5];

  for (let i = 0; i < config.numClientNodes; i++) {
    //console.log('Forking a new subprocess....');
    const child = fork('scripts/spawnClientMsgLoad.js', [
      config.testDurationMs,
      config.targetMsgsPerSecond,
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
        setTimeout(resolve, 2000);
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
