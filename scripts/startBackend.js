const {
  MasterNode
} = require('../src/index.js');

(function () {
  if (process.argv.length >= 7) {
    let serviceServerPortZMQ = process.argv[2];
    let serviceServerPortREST = process.argv[3];
    let topicDataServerPortZMQ = process.argv[4];
    let topicDataServerPortWS = process.argv[5];
    let useHTTPS = process.argv[6] === 'true' ? true : false;

    console.log('Starting master node with the following ports:\n' +
      'ZMQ service: ' + serviceServerPortZMQ +
      '\nZMQ topic data: ' + topicDataServerPortZMQ +
      '\nREST service: ' + serviceServerPortREST +
      '\nWebsocket service: ' + topicDataServerPortWS);
    console.log('using HTTPS: ' + useHTTPS);

    let master = new MasterNode(
      serviceServerPortZMQ,
      serviceServerPortREST,
      topicDataServerPortZMQ,
      topicDataServerPortWS,
      useHTTPS);
  } else {
    let master = new MasterNode();
  }
})();