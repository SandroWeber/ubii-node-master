const {
  RESTClient,
  WebsocketClient
} = require('@tum-far/ubii-msg-transport');

const {ProtobufTranslator, MSG_TYPES, DEFAULT_TOPICS} = require('@tum-far/ubii-msg-formats');

class ClientNodeWeb {
  constructor(name,
              serviceHost,
              servicePort) {
    // Properties:
    this.name = name;
    this.serviceHost = serviceHost;
    this.servicePort = servicePort;

    // Translators:
    this.translatorServiceReply = new ProtobufTranslator(MSG_TYPES.SERVICE_REPLY);
    //this.translatorServiceRequest = new ProtobufTranslator(MSG_TYPES.SERVICE_REQUEST);
    this.translatorTopicData = new ProtobufTranslator(MSG_TYPES.TOPIC_DATA);

    // Cache for specifications:
    this.clientSpecification = {};
    this.deviceSpecifications = new Map();

    this.topicDataCallbacks = new Map();
  }

  /**
   * Initialize this client.
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      this.serviceClient = new RESTClient(this.serviceHost, this.servicePort);

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

  initializeTopicDataClient(serverSpecification) {
    this.topicDataClient = new WebsocketClient(
      this.clientSpecification.id,
      serverSpecification.ip,
      parseInt(serverSpecification.portTopicDataWs),
      (messageBuffer) => {
        try {
          // Decode the buffer.
          let message = this.translatorTopicData.createMessageFromBuffer(messageBuffer);

          // Call callbacks.
          this._onTopicDataMessageReceived(message);
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

    return this.callService('/services', message).then(
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

    return this.callService('/services', message).then(
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

    return this.callService('/services', message).then(
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
   * Subscribe to the specified topic and register callback on topic message received.
   * @param {*} topic
   * @param {*} callback
   */
  async subscribe(topic, callback) {
    let message = {
      topic: DEFAULT_TOPICS.SERVICES.TOPIC_SUBSCRIPTION,
      topicSubscription: {
        clientID: this.clientSpecification.id,
        subscribeTopics: [topic]
      }
    };

    return this.callService('/services', message).then(
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

    /*return new Promise((resolve, reject) => {

      this.serviceClient.send('/services', {buffer: this.translatorServiceRequest.createBufferFromPayload(message)})
        .then((reply) => {
          let message = this.translatorServiceReply.createMessageFromBuffer(reply.buffer.data);
          // The reply should be a success.
          if (message.success !== undefined && message.success !== null) {
            resolve();
          } else {
            // TODO: log error
            reject();
          }
        });
    });*/
  }

  /**
   * Call a service specified by the topic with a message and callback.
   * @param {String} topic The topic relating to the service to be called
   * @param {Object} message An object representing the protobuf message to be sent
   * @param {Function} callback The function to be called with the reply
   */
  callService(topic, message) {
    return new Promise((resolve, reject) => {
      //TODO: just send JSON?
      // VARIANT A: PROTOBUF
      //let buffer = this.translatorServiceRequest.createBufferFromPayload(message);
      //console.info(buffer);
      //this.serviceClient.send('/services', {buffer: JSON.stringify(buffer)})
      // VARIANT B: JSON
      this.serviceClient.send(topic, {message: JSON.stringify(message)}).then(
        (reply) => {
          // VARIANT A: PROTOBUF
          //let message = this.translatorServiceReply.createMessageFromBuffer(reply.buffer.data);
          // VARIANT B: JSON
          let json = JSON.parse(reply.message);
          let message = this.translatorServiceReply.createMessageFromPayload(json);

          return resolve(message);
        },
        (error) => {
          console.error(error);
          return reject();
        });
    });
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

    buffer = this.translatorTopicData.createBufferFromPayload(payload);

    this.topicDataClient.send(buffer);
  }

  _onTopicDataMessageReceived(message) {
    if (message.topicDataRecord && message.topicDataRecord.topic) {
      let callbacks = this.topicDataCallbacks.get(message.topicDataRecord.topic);
      callbacks.forEach((cb) => {cb(message.topicDataRecord[message.topicDataRecord.type])})
    }
  }
}

module.exports = {
  ClientNodeWeb: ClientNodeWeb,
};