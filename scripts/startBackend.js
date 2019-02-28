const {
  MasterNode
} = require('../src/index.js');

(function () {
  if (process.argv.length >= 6) {
    let serviceServerPortZMQ = process.argv[2];
    let topicDataServerPortZMQ = process.argv[3];
    let serviceServerPortREST = process.argv[4];
    let topicDataServerPortWS = process.argv[5];

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
    let master = new MasterNode('localhost');
  }
})();