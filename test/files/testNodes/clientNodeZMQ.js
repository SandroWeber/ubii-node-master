const ZmqDealer = require('./zmqDealer');
const ZmqRequest = require('./zmqRequest');

const {ProtobufTranslator, MSG_TYPES, DEFAULT_TOPICS} = require('@tum-far/ubii-msg-formats');

class ClientNodeZMQ {
  constructor(name,
              serverHost,
              servicePort) {
    // Properties:
    this.name = name;
    this.serverHost = serverHost;
    this.servicePort = servicePort;

    // Translators:
    this.topicDataTranslator = new ProtobufTranslator(MSG_TYPES.TOPIC_DATA);
    this.serviceRequestTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REQUEST);
    this.serviceReplyTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REPLY);

    // Cache for specifications:
    this.clientSpecification = {};
    this.deviceSpecifications = new Map();

    // Service requests
    this.pendingServiceRequests = [];
    this.activeServiceRequest = null;

    this.topicDataCallbacks = new Map();
  }

  /**
   * Initialize this client.
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      this.initializeServiceClient();

      this.getServerConfig().then(() => {
        this.registerClient()
          .then(() => {
            this.initializeTopicDataClient(this.serverSpecification);
            return resolve();
          })
          .catch((error) => {
            console.error(error);
            return reject();
          });
      });
    });
  }

  initializeServiceClient() {
    // Initialize the service client.
    this.serviceClient = new ZmqRequest(this.serverHost, this.servicePort, (messageBuffer) => {
      try {
        if (this.activeServiceRequest !== null) {
          // Resolve currently active service request.
          this.activeServiceRequest.processReply(messageBuffer);

          // Process next pending service request.
          this._processNextServiceRequest();
        }
      } catch (e) {
        (console.error || console.log).call(console, 'Ubii client service reply processing failed with an error: ' + (e.stack || e));
      }
    });
  }

  initializeTopicDataClient(serverSpecification) {
    this.topicDataClient = new ZmqDealer(
      this.clientSpecification.id,
      this.serverHost,
      parseInt(serverSpecification.portTopicDataWs),
      (envelopes, messageBuffer) => {
        try {
          // Decode the buffer.
          let received = this.topicDataTranslator.createMessageFromBuffer(messageBuffer);

          // Call callbacks.
          this._onTopicDataMessageReceived(received);
        } catch (e) {
          (console.error || console.log).call(console, 'Ubii Message Translator createMessageFromBuffer failed with an error: ' + (e.stack || e));
        }
      });
  }

  /**
   * Is this client already initialized?
   */
  isInitialized() {
    return (this.serviceClient !== undefined && this.topicDataClient !== undefined);
  }

  async getServerConfig() {
    let message = {
      topic: DEFAULT_TOPICS.SERVICES.SERVER_CONFIG
    };

    return this.callService(message).then(
      (reply) => {
        if (reply.serverSpecification !== undefined && reply.serverSpecification !== null) {
          // Process the reply client specification.
          this.serverSpecification = reply.serverSpecification;
        }
      },
      (error) => {
        console.error(error);
      }
    );
  }

  /**
   * Register this client at the masterNode.
   */
  async registerClient() {
    let message = {
      topic: DEFAULT_TOPICS.SERVICES.CLIENT_REGISTRATION,
      clientRegistration: {
        name: this.name
      }
    };

    return this.callService(message).then(
      (reply) => {
        if (reply.clientSpecification !== undefined && reply.clientSpecification !== null) {
          this.clientSpecification = reply.clientSpecification;
        }
      }
    );
  }

  /**
   * Register the specified device at the masterNode.
   * @param {String} deviceName
   * @param {*} deviceType
   */
  async registerDevice(deviceName, deviceType) {
    let message = {
      topic: DEFAULT_TOPICS.SERVICES.DEVICE_REGISTRATION,
      deviceRegistration: {
        name: deviceName,
        clientId: this.clientSpecification.id,
        deviceType: deviceType
      }
    };

    return this.callService(message).then(
      (reply) => {
        if (reply.deviceSpecification !== undefined && reply.deviceSpecification !== null) {
          // Process the reply client specification.
          this.deviceSpecifications.set(reply.deviceSpecification.name, reply.deviceSpecification);

          return reply.deviceSpecification.id;
        }
      },
      (error) => {
        console.error(error);
      }
    );
  }

  /**
   * Subscribe and unsubscribe to the specified topics.
   * @param {*} deviceName
   * @param {*} subscribeTopics
   * @param {*} unsubscribeTopics
   */
  async subscribe(topic, callback) {
    let message = {
      topic: DEFAULT_TOPICS.SERVICES.TOPIC_SUBSCRIPTION,
      topicSubscription: {
        clientID: this.clientSpecification.id,
        subscribeTopics: [topic]
      }
    };

    return this.callService(message).then(
      (reply) => {
        if (reply.success !== undefined && reply.success !== null) {
          let callbacks = this.topicDataCallbacks.get(topic);
          if (callbacks && callbacks.length > 0) {
            callbacks.push(callback);
          } else {
            this.topicDataCallbacks.set(topic, [callback]);
          }
        } else {
          console.error('ClientNodeWeb - subscribe failed (' + topic + ')\n' +
            reply);
        }
      },
      (error) => {
        console.error(error);
      }
    );
  }

  /**
   * Publish the specified value of the specified type under the specified topic to the master node.
   * @param {String} deviceName
   * @param {String} topic
   * @param {String} type
   * @param {*} value
   */
  publish(deviceName, topic, type, value) {
    let payload, buffer;

    payload = {
      deviceId: this.deviceSpecifications.get(deviceName).id,
      topicDataRecord: {
        topic: topic
      }
    };
    payload.topicDataRecord[type] = value;

    buffer = this.topicDataTranslator.createBufferFromPayload(payload);

    this.topicDataClient.send(buffer);
  }

  /**
   * Call a service specified by the topic with a message and callback.
   * @param {String} topic The topic relating to the service to be called
   * @param {Object} message An object representing the protobuf message to be sent
   * @param {Function} callback The function to be called with the reply
   */
  callService(message) {
    return new Promise((resolve, reject) => {
      // Create the serviceRequest.
      let serviceRequest = {
        formulateRequest: () => {
          return this.serviceRequestTranslator.createBufferFromPayload(message);
        },
        processReply: (reply) => {
          let message = this.serviceReplyTranslator.createMessageFromBuffer(reply);
          resolve(message);
        }
      };

      this._addServiceRequest(serviceRequest);
    });
  }

  /**
   * Add the specified serviceRequest to the pending service requests list.
   * @param {*} serviceRequest
   */
  _addServiceRequest(serviceRequest) {
    let startProcess = false;

    // Should we invoke the process?
    // If there is an active service request this is not necessary because it will process the next perning
    // service request automatically when its response is received.
    if (this.activeServiceRequest === null) {
      startProcess = true;
    }

    // Push the serviceRequest.
    this.pendingServiceRequests.push(serviceRequest);

    // Invoke the service request process if necessary.
    if (startProcess) {
      this._processNextServiceRequest();
    }
  }

  /**
   * Start the processing of the next pending service request if there is one.
   * Resets the activeServiceRequest otherwise.
   */
  _processNextServiceRequest() {
    if (this.pendingServiceRequests.length > 0) {
      // There is a pending service request: Start the processing of this request.

      // Set the active service request to the next pending service request.
      this.activeServiceRequest = this.pendingServiceRequests.shift();

      // Send the request to the server.
      this.serviceClient.send(this.activeServiceRequest.formulateRequest());
    } else {
      // There are no pending service requests: Reset active service request.

      this.activeServiceRequest = null;
    }
  }

  _onTopicDataMessageReceived(message) {
    if (message.topicDataRecord && message.topicDataRecord.topic) {
      let callbacks = this.topicDataCallbacks.get(message.topicDataRecord.topic);
      callbacks.forEach((cb) => {
        cb(message.topicDataRecord[message.topicDataRecord.type])
      })
    }
  }
}

module.exports = {
  ClientNodeZMQ: ClientNodeZMQ,
};
