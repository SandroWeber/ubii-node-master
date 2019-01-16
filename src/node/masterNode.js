const {
  UbiiNode
} = require('./../ubiiNode.js');
const {
  defaultTopicDataServerPortZMQ,
  defaultTopicDataServerPortWS,
  defaultServiceServerPortZMQ,
  defaultServiceServerPortREST
} = require('./../constants.js');

const {
  ServerConnectionsManager
} = require('./serverConnectionsManager.js');

const {
  RuntimeTopicData
} = require('@tum-far/ubii-topic-data');
const {
  ZmqRouter,
  ZmqReply,
  WebsocketServer,
  RESTServer
} = require('@tum-far/ubii-msg-transport');
const {
  ClientManager
} = require('@tum-far/ubii-client-manager');
const {
  DeviceManager
} = require('@tum-far/ubii-device-manager');
const {
  ServiceManager
} = require('@tum-far/ubii-services');
const {
  SessionManager
} = require('@tum-far/ubii-session-manager');
const {
  ServiceRequestTranslator,
  ServiceReplyTranslator,
  TopicDataTranslator
} = require('@tum-far/ubii-msg-formats');
const namida = require('@tum-far/namida');

class MasterNode extends UbiiNode {
  constructor(topicDataServerHost,
              topicDataServerPortZMQ = defaultTopicDataServerPortZMQ,
              topicDataServerPortWS = defaultTopicDataServerPortWS,
              serviceServerPortZMQ = defaultServiceServerPortZMQ,
              serviceServerPortREST = defaultServiceServerPortREST) {
    super();

    // Translators:
    this.serviceReplyTranslator = new ServiceReplyTranslator();
    this.serviceRequestTranslator = new ServiceRequestTranslator();
    this.topicDataTranslator = new TopicDataTranslator();

    // Topic Data Component:
    this.topicData = new RuntimeTopicData();

    this.connectionsManager = new ServerConnectionsManager(
      topicDataServerPortZMQ,
      topicDataServerPortWS,
      serviceServerPortZMQ,
      serviceServerPortREST);
    this.connectionsManager.onServiceMessageREST((...params) => this.onServiceMessageREST(...params));
    this.connectionsManager.onServiceMessageZMQ((...params) => this.onServiceMessageZMQ(...params));
    this.connectionsManager.onTopicDataMessageWS((...params) => this.onTopicDataMessageWS(...params));
    this.connectionsManager.onTopicDataMessageZMQ((...params) => this.onTopicDataMessageZMQ(...params));

    // Client Manager Component:
    this.clientManager = new ClientManager(this.connectionsManager);

    // Device Manager Component:
    this.deviceManager = new DeviceManager(this.clientManager,
      this.topicData,
      this.connectionsManager.connections.topicDataZMQ);

    // Service Manager Component:
    this.serviceManager = new ServiceManager(this.clientManager,
      this.deviceManager,
      topicDataServerHost.toString(),
      this.connectionsManager.ports.topicDataZMQ.toString());

    // Session manager component:
    this.sessionManager = new SessionManager();
  }

  /*

   */

  onServiceMessageZMQ(message) {
    // Create context.
    let context = {
      feedback: {
        title: '',
        message: '',
        stack: ''
      }
    };

    try {
      // Decode buffer.
      let request = this.serviceRequestTranslator.createMessageFromBuffer(message);

      // Process request.
      let reply = this.serviceManager.zmqProcessRequest(request);

      // Return reply.
      return this.serviceReplyTranslator.createBufferFromPayload(reply);
    } catch (e) {
      context.feedback.title = 'Ubii service request processing failed';
      context.feedback.message = `Ubii service request processing failed with an error:`;
      context.feedback.stack = '' + (e.stack || e);

      namida.logFailure(context.feedback.title,
        context.feedback.message,
        context.feedback.stack);

      return this.serviceReplyTranslator.createBufferFromPayload({
        error: {
          title: context.feedback.title,
          message: context.feedback.message,
          stack: context.feedback.stack
        }
      });
    }
  }

  onServiceMessageREST(request, response) {

    console.info('onServiceMessageREST');
    try {
      // Decode buffer.
      let message = this.serviceRequestTranslator.createMessageFromBuffer(request.body.buffer.data);

      // Process request.
      let reply = this.serviceManager.processRequest(message);

      // Return reply.
      let buffer = this.serviceReplyTranslator.createBufferFromPayload(reply);
      response.json({buffer: buffer});
      return buffer;
    } catch (e) {
      // Create context.
      let context = {
        feedback: {
          title: '',
          message: '',
          stack: ''
        }
      };

      context.feedback.title = 'Ubii service request processing failed';
      context.feedback.request = `Ubii service request processing failed with an error:`;
      context.feedback.stack = '' + (e.stack || e);

      console.warn(e);
      namida.logFailure(context.feedback.title,
        context.feedback.request,
        context.feedback.stack);

      return this.serviceReplyTranslator.createBufferFromPayload({
        error: {
          title: context.feedback.title,
          message: context.feedback.request,
          stack: context.feedback.stack
        }
      });
    }
  }

  onTopicDataMessageZMQ(envelope, message) {
    // Create context.
    let context = {
      feedback: {
        title: '',
        message: '',
        stack: ''
      }
    };

    try {
      // Decode buffer.
      let topicDataMessage = this.topicDataTranslator.createMessageFromBuffer(message);

      // Process message.
      this.processTopicDataMessage(envelope, topicDataMessage);
    } catch (e) {
      context.feedback.title = 'TopicData message publishing failed';
      context.feedback.message = `TopicData message publishing failed with an error:`;
      context.feedback.stack = '' + (e.stack || e);

      namida.error(context.feedback.title,
        context.feedback.message,
        context.feedback.stack);

      try {
        // Send error:
        this.topicDataServerZMQ.send(envelope, this.topicDataTranslator.createBufferFromPayload({
          error: {
            title: context.feedback.title,
            message: context.feedback.message,
            stack: context.feedback.stack
          }
        }));
      } catch (e) {
        context.feedback.title = 'TopicData error response sending failed';
        context.feedback.message = `opicData error response sending failed with an error:`;
        context.feedback.stack = '' + (e.stack || e);

        namida.error(context.feedback.title,
          context.feedback.message,
          context.feedback.stack);
      }
    }

    return message;
  }

  onTopicDataMessageWS(message) {

  }

  processTopicDataMessage(clientIdentifier, topicDataMessage) {
    // Prepare the context.
    let context = {
      feedback: {
        title: '',
        message: '',
        stack: ''
      }
    };

    // Extract the relevant information.
    let deviceIdentifier = topicDataMessage.deviceIdentifier;

    // Verification process:

    // Verify the client and act accordingly.
    if (!this.clientManager.verifyClient(clientIdentifier.toString())) {
      // Update the context feedback.
      context.feedback.message = `There is no Client registered with the id ${namida.style.messageHighlight(clientIdentifier)}. ` +
        `Message processing was aborted due to an unregistered client.`;
      context.feedback.title = 'Message processing aborted';

      namida.logFailure(context.feedback.title, context.feedback.message);


      this.topicDataServerZMQ.send(clientIdentifier,
        this.topicDataTranslator.createBufferFromPayload({
          deviceIdentifier: deviceIdentifier,
          error: {
            title: context.feedback.title,
            message: context.feedback.message,
            stack: context.feedback.stack
          }
        }));
    }

    // Verify the device and act accordingly.
    if (!this.deviceManager.verifyParticipant(deviceIdentifier)) {
      // Update the context feedback.
      context.feedback.message = `There is no Participant registered with the id ${namida.style.messageHighlight(deviceIdentifier)}. ` +
        `Subscribtion was rejected due to an unregistered device.`;
      context.feedback.title = 'Subscribtion rejected';

      namida.logFailure(context.feedback.title, context.feedback.message);

      this.topicDataServerZMQ.send(clientIdentifier,
        this.topicDataTranslator.createBufferFromPayload({
          deviceIdentifier: deviceIdentifier,
          error: {
            title: context.feedback.title,
            message: context.feedback.message,
            stack: context.feedback.stack
          }
        }));
    }

    // Publication process:

    // Get the current device.
    let currentParticipant = this.deviceManager.getParticipant(deviceIdentifier);

    // Update device information.
    currentParticipant.updateLastSignOfLife();

    // Update client information.
    this.clientManager.getClient(currentParticipant.clientIdentifier).updateLastSignOfLife();
    currentParticipant.updateLastSignOfLife();

    // Publish the data.
    currentParticipant.publish(topicDataMessage.topicDataRecord.topic,
      topicDataMessage.topicDataRecord.type,
      topicDataMessage.topicDataRecord[topicDataMessage.topicDataRecord.type]);
  }
}

module.exports = {
  'MasterNode': MasterNode,
}