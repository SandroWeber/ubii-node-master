//const { UbiiClientNode } = require('@tum-far/ubii-node-nodejs');

(async function () {
  console.info(process.argv);

  if (process.argv[2] === 'child') {
    setTimeout(() => {
      console.log(`Hello from ${process.argv[2]}!`);
    }, 1_000);
  } else {
    const { fork } = require('child_process');
    const controller = new AbortController();
    const { signal } = controller;
    const child = fork(__filename, ['child'], { signal });
    child.on('error', (err) => {
      // This will be called with err being an AbortError if the controller aborts
    });
    controller.abort(); // Stops the child process
  }
})();

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
