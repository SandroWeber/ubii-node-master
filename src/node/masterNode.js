const {
  defaultTopicDataServerPortZMQ,
  defaultTopicDataServerPortWS,
  defaultServiceServerPortZMQ,
  defaultServiceServerPortREST
} = require('./constants.js');

const {
  ServerConnectionsManager
} = require('../network/serverConnectionsManager.js');

const {
  RuntimeTopicData
} = require('@tum-far/ubii-topic-data');
const {
  ClientManager
} = require('../clients/clientManager');
const {
  DeviceManager
} = require('../devices/deviceManager');
const {
  ServiceManager
} = require('../services/serviceManager');
const {
  SessionManager
} = require('../sessions/sessionManager');

const { ProtobufTranslator, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const namida = require('@tum-far/namida');

class MasterNode {
  constructor(topicDataServerHost,
    topicDataServerPortZMQ = defaultTopicDataServerPortZMQ,
    topicDataServerPortWS = defaultTopicDataServerPortWS,
    serviceServerPortZMQ = defaultServiceServerPortZMQ,
    serviceServerPortREST = defaultServiceServerPortREST) {

    // Translators:
    this.topicDataTranslator = new ProtobufTranslator(MSG_TYPES.TOPIC_DATA);
    this.serviceRequestTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REQUEST);
    this.serviceReplyTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REPLY);

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
      this.connectionsManager.ports.topicDataZMQ.toString(),
      this.connectionsManager.ports.topicDataWS.toString());

    // Session manager component:
    this.sessionManager = new SessionManager();
  }

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
      let reply = this.serviceManager.processRequest(request);

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
    try {
      // Decode buffer.
      // VARIANT A: PROTOBUF
      //let message = this.serviceRequestTranslator.createMessageFromBuffer(JSON.parse(request.body.buffer));
      // VARIANT B: JSON
      let json = JSON.parse(request.body.message);
      let message = this.serviceRequestTranslator.createMessageFromPayload(json);

      // Process request.
      let reply = this.serviceManager.processRequest(message);

      // Return reply.
      // VARIANT A: PROTOBUF
      //let buffer = this.serviceReplyTranslator.createBufferFromPayload(reply);
      //response.json({ buffer: buffer });
      //return buffer;
      // VARIANT B: JSON
      response.json({ message: JSON.stringify(reply) });
      return JSON.stringify(reply);
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
    console.info('master.onTopicDataMessageZMQ() - ' + envelope);
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
      context.feedback.title = 'TopicData message publishing failed (ZMQ)';
      context.feedback.message = `TopicData message publishing failed (ZMQ) with an error:`;
      context.feedback.stack = '' + (e.stack || e);

      namida.error(context.feedback.title,
        context.feedback.message,
        context.feedback.stack);

      try {
        // Send error:
        this.connectionsManager.connections.topicDataZMQ.send(envelope, this.topicDataTranslator.createBufferFromPayload({
          error: {
            title: context.feedback.title,
            message: context.feedback.message,
            stack: context.feedback.stack
          }
        }));
      } catch (e) {
        context.feedback.title = 'TopicData error response sending failed (ZMQ)';
        context.feedback.message = `opicData error response sending failed (ZMQ) with an error:`;
        context.feedback.stack = '' + (e.stack || e);

        namida.error(context.feedback.title,
          context.feedback.message,
          context.feedback.stack);
      }
    }

    return message;
  }

  onTopicDataMessageWS(message) {
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
      let clientID = this.deviceManager.getParticipant(topicDataMessage.deviceIdentifier).client.identifier;
      this.processTopicDataMessage(clientID, topicDataMessage);
    } catch (e) {
      context.feedback.title = 'TopicData message publishing failed (WS)';
      context.feedback.message = `TopicData message publishing failed (WS) with an error:`;
      context.feedback.stack = '' + (e.stack || e);

      namida.error(context.feedback.title,
        context.feedback.message,
        context.feedback.stack);

      try {
        // Send error:
        let topicDataMessage = this.topicDataTranslator.createMessageFromBuffer(message);
        let clientID = this.deviceManager.getParticipant(topicDataMessage.deviceIdentifier).client.identifier;
        this.connectionsManager.send(clientID, this.topicDataTranslator.createBufferFromPayload({
          error: {
            title: context.feedback.title,
            message: context.feedback.message,
            stack: context.feedback.stack
          }
        }));
      } catch (e) {
        context.feedback.title = 'TopicData error response sending failed (WS)';
        context.feedback.message = `opicData error response sending failed (WS) with an error:`;
        context.feedback.stack = '' + (e.stack || e);

        namida.error(context.feedback.title,
          context.feedback.message,
          context.feedback.stack);
      }
    }

    return message;
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

      this.connectionsManager.send(clientIdentifier,
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
        `Subscription was rejected due to an unregistered device.`;
      context.feedback.title = 'Subscription rejected';

      namida.logFailure(context.feedback.title, context.feedback.message);

      this.connectionsManager.send(clientIdentifier,
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
    this.clientManager.getClient(currentParticipant.client.identifier).updateLastSignOfLife();

    // Publish the data.
    currentParticipant.publish(topicDataMessage.topicDataRecord.topic,
      topicDataMessage.topicDataRecord.type,
      topicDataMessage.topicDataRecord[topicDataMessage.topicDataRecord.type]);
  }
}

module.exports = {
  'MasterNode': MasterNode,
};