const {
  MasterNode
} = require('../src/index.js');
const readline = require('readline');

(function () {
  let rl1 = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  let serviceServerPortZMQ = 0, topicDataServerPortZMQ = 0;
  let serviceServerPortREST = 0, topicDataServerPortWS = 0;

  if (process.argv.length >= 6) {
    serviceServerPortZMQ = process.argv[2];
    topicDataServerPortZMQ = process.argv[3];
    serviceServerPortREST = process.argv[4];
    topicDataServerPortWS = process.argv[5];

    console.log('Starting master node with the following ports - ' +
      'ZMQ service: ' + serviceServerPortZMQ +
      ', ZMQ topic data: ' + topicDataServerPortZMQ +
      ', REST service: ' + serviceServerPortREST +
      ', Websocket service: ' + topicDataServerPortWS);

    let master = new MasterNode(
      'localhost',
      topicDataServerPortZMQ,
      topicDataServerPortWS,
      serviceServerPortZMQ,
      serviceServerPortREST);
  } else {
    rl1.question('Enter the port number for the ZMQ SERVICE server of the master node: ', function (answer1) {
      serviceServerPortZMQ = answer1;

      rl1.question('Enter the port number for the ZMQ TOPICDATA server of the master node: ', function (answer2) {
        topicDataServerPortZMQ = answer2;

        rl1.question('Enter the port number for the REST SERVICE server of the master node: ', function (answer3) {
          serviceServerPortREST = answer3;

          rl1.question('Enter the port number for the WEBSOCKET TOPICDATA server of the master node: ', function (answer4) {
            topicDataServerPortWS = answer4;

            console.log('Starting master node with the following ports - ' +
              'ZMQ service: ' + serviceServerPortZMQ +
              ', ZMQ topic data: ' + topicDataServerPortZMQ +
              ', REST service: ' + serviceServerPortREST +
              ', Websocket service: ' + topicDataServerPortWS);

            let master = new MasterNode(
              'localhost',
              topicDataServerPortZMQ,
              topicDataServerPortWS,
              serviceServerPortZMQ,
              serviceServerPortREST);

            rl1.close();
          });
        });
      });
    });
  }
})();