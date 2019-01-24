const {
  RESTClient,
  WebsocketClient
} = require('@tum-far/ubii-msg-transport');
const {
  ServiceRequestTranslator,
  ServiceReplyTranslator,
  TopicDataTranslator
} = require('@tum-far/ubii-msg-formats');

class ClientNodeWeb {
  constructor(name,
              serviceHost,
              servicePort) {
    // Properties:
    this.name = name;
    this.serviceHost = serviceHost;
    this.servicePort = servicePort;

    // Translators:
    this.topicDataTranslator = new TopicDataTranslator();
    this.serviceRequestTranslator = new ServiceRequestTranslator();
    this.serviceReplyTranslator = new ServiceReplyTranslator();

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
          resolve();
        })
        .catch((error) => {
          console.warn(error);
          reject();
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
          let message = this.topicDataTranslator.createMessageFromBuffer(messageBuffer);

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
    return new Promise((resolve, reject) => {
      let message = {
        clientRegistration: {
          name: this.name,
          namespace: ''
        }
      };

      this.serviceClient.send('/services', {buffer: this.serviceRequestTranslator.createBufferFromPayload(message)})
        .then((reply) => {
          let message = this.serviceReplyTranslator.createMessageFromBuffer(reply.buffer.data);
          if (message.clientSpecification !== undefined && message.clientSpecification !== null) {
            // Process the reply client specification.

            // Cache the client specification.
            this.clientSpecification = message.clientSpecification;

            resolve();
          }
        });
    });
  }

  /**
   * Register the specified device at the masterNode.
   * @param {String} deviceName
   * @param {*} deviceType
   */
  async registerDevice(deviceName, deviceType) {
    return new Promise((resolve, reject) => {
      let message = {
        deviceRegistration: {
          name: deviceName,
          deviceType: deviceType,
          correspondingClientIdentifier: this.clientSpecification.identifier,
        }
      };

      this.serviceClient.send('/services', {buffer: this.serviceRequestTranslator.createBufferFromPayload(message)})
        .then((reply) => {
          let message = this.serviceReplyTranslator.createMessageFromBuffer(reply.buffer.data);
          // The reply should be a device specification.
          if (message.deviceSpecification !== undefined && message.deviceSpecification !== null) {
            // Process the reply client specification.
            this.deviceSpecifications.set(message.deviceSpecification.name, message.deviceSpecification);
            resolve();
          } else {
            // TODO: log error
            reject();
          }
        });
    });
  }

  /**
   * Subscribe and unsubscribe to the specified topics.
   * @param {*} deviceName
   * @param {*} subscribeTopics
   * @param {*} unsubscribeTopics
   */
  async subscribe(deviceName, subscribeTopics, unsubscribeTopics) {
    return new Promise((resolve, reject) => {
      let message = {
        topic: '',
        subscription: {
          deviceIdentifier: this.deviceSpecifications.get(deviceName).identifier,
          subscribeTopics: subscribeTopics,
          unsubscribeTopics: unsubscribeTopics
        }
      };

      this.serviceClient.send('/services', {buffer: this.serviceRequestTranslator.createBufferFromPayload(message)})
        .then((reply) => {
          let message = this.serviceReplyTranslator.createMessageFromBuffer(reply.buffer.data);
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

    buffer = this.topicDataTranslator.createBufferFromPayload(payload);

    this.topicDataClient.send(buffer);
  }

  onTopicDataMessageReceived(message) {
  }
}

module.exports = {
  ClientNodeWeb: ClientNodeWeb,
};