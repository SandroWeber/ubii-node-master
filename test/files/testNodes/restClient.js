const axios = require('axios');

class RESTClient {

  /**
   * Communication endpoint implementing the zmq request pattern.
   * @param {*} host Host to connect to.
   * @param {*} port Port to connect to.
   * @param {*} onReceive Callback function that is called when a new message is received.
   * @param {*} autoConnect Should the socket connect directly after the initialization of the object?
   * If not, the start method must be called manually.
   */
  constructor(host = 'localhost',
              port = 5555,
              autoConnect = true) {
    this.host = host;
    this.port = port;

    if (autoConnect) {
      this.start();
    }
  }

  start() {
  }

  send(route, message) {
    let url = 'http://' + this.host + ':' + this.port + route;

    return new Promise((resolve, reject) => {
      axios.post(url, message)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          console.warn(error);
          reject(error);
        });
    });
  }

  stop() {
  }

}


module.exports = RESTClient;
