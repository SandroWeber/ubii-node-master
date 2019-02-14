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
    this.translatorServiceRequest = new ProtobufTranslator(MSG_TYPES.SERVICE_REQUEST);
    this.translatorTopicData = new ProtobufTranslator(MSG_TYPES.TOPIC_DATA);

    // Cache for specifications:
    this.clientSpecification = {};
    this.deviceSpecifications = new Map();
  }

  /**
   * Initialize this client.
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      this.serviceClient = new RESTClient(this.serviceHost, this.servicePort);

      this.registerClient()
        .then(() => {
          this.initializeTopicDataClient(this.clientSpecification);
          return resolve();
        })
        .catch((error) => {
          console.error(error);
          return reject();
        });
    });
  }

  initializeTopicDataClient(clientSpecification) {
    this.topicDataClient = new WebsocketClient(
      clientSpecification.identifier,
      clientSpecification.topicDataHost,
      parseInt(clientSpecification.topicDataPortWs),
      (messageBuffer) => {
        try {
          // Decode the buffer.
          let message = this.translatorTopicData.createMessageFromBuffer(messageBuffer);

          // Call callbacks.
          this.onTopicDataMessageReceived(message);
        } catch (e) {
          (console.error || console.log).call(console, 'Ubii Message Translator createMessageFromBuffer failed with an error: ' + (e.stack || e));
        }
      });
  }

  /**
   * Is this client already initialized?
   */
  isInitialized() {
    // Check if both clients are initialized.
    if (this.serviceClient === undefined || this.topicDataClient === undefined) {
      return false;
    }
    return true;
  }

  /**
   * Register this client at the masterNode.
   */
  async registerClient() {
    let message = {
      topic: DEFAULT_TOPICS.SERVICES.CLIENT_REGISTRATION,
      clientRegistration: {
        name: this.name,
        namespace: ''
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
        device: {
          name: deviceName,
          clientId: this.clientSpecification.identifier
        },
        deviceType: deviceType,
        correspondingClientIdentifier: this.clientSpecification.identifier,
      }
    };

    return this.callService('/services', message).then(
      (reply) => {
        if (reply.deviceSpecification !== undefined && reply.deviceSpecification !== null) {
          // Process the reply client specification.
          this.deviceSpecifications.set(reply.deviceSpecification.name, reply.deviceSpecification);
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
  async subscribe(deviceName, subscribeTopics, unsubscribeTopics) {
    let message = {
      topic: DEFAULT_TOPICS.SERVICES.TOPIC_SUBSCRIPTION,
      subscription: {
        deviceIdentifier: this.deviceSpecifications.get(deviceName).identifier,
        subscribeTopics: subscribeTopics,
        unsubscribeTopics: unsubscribeTopics
      }
    };

    return this.callService('/services', message).then(
      (reply) => {
        if (reply.success !== undefined && reply.success !== null) {
          console.info('subscribe successful (' + deviceName + ' -> ' + subscribeTopics + ')');
        } else {
          console.error('subscribe failed (' + deviceName + ' -> ' + subscribeTopics + ')\n' +
            reply);
        }
      },
      (error) => {
        console.error(error);
      }
    );

    return new Promise((resolve, reject) => {

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
    });
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
      deviceIdentifier: this.deviceSpecifications.get(deviceName).identifier,
      topicDataRecord: {
        topic: topic
      }
    };
    payload.topicDataRecord[type] = value;

    buffer = this.translatorTopicData.createBufferFromPayload(payload);

    this.topicDataClient.send(buffer);
  }

  onTopicDataMessageReceived(message) {
  }
}

module.exports = {
  ClientNodeWeb: ClientNodeWeb,
};