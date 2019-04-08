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
const {
  InteractionDatabase
} = require('../storage/interactionDatabase');
const {
  SessionDatabase
} = require('../storage/sessionDatabase');

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
    this.clientManager = new ClientManager(this.connectionsManager, this.topicData);

    // Device Manager Component:
    this.deviceManager = new DeviceManager(this.clientManager,
      this.topicData,
      this.connectionsManager.connections.topicDataZMQ);

    // Session manager component:
    this.sessionManager = new SessionManager(this.topicData);

    // Service Manager Component:
    this.serviceManager = new ServiceManager(
      this.clientManager,
      this.deviceManager,
      this.connectionsManager,
      this.topicData,
      this.sessionManager,
      topicDataServerHost.toString());
  }

  onServiceMessageZMQ(message) {
    try {
      // Decode buffer.
      let request = this.serviceRequestTranslator.createMessageFromBuffer(message);

      // Process request.
      let reply = this.serviceManager.processRequest(request);

      // Return reply.
      return this.serviceReplyTranslator.createBufferFromPayload(reply);
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
      /*let requestBuffer = new Uint8Array(request.body);
      let requestMessage = this.serviceRequestTranslator.createMessageFromBuffer(requestBuffer);
      console.info('### onServiceMessageREST - request ###');
      console.info(requestMessage);
      console.info(requestBuffer.length);
      console.info(requestBuffer);*/

      // VARIANT B: JSON
      let requestMessage = this.serviceRequestTranslator.createMessageFromPayload(request.body);

      console.info('##### onServiceMessageREST - request:');
      console.info(request.body);
      console.info('# onServiceMessageREST - requestMessage:');
      console.info(requestMessage);
      console.info('# onServiceMessageREST - type:');
      console.info(requestMessage.type);

      // Process request.
      let reply = this.serviceManager.processRequest(requestMessage);

      // Return reply.
      // VARIANT A: PROTOBUF
      /*let replyBuffer = this.serviceReplyTranslator.createBufferFromMessage(reply);
      console.info(replyBuffer.length);
      console.info(replyBuffer);
      response.send(replyBuffer);
      return replyBuffer;*/

      // VARIANT B: JSON
      response.json(reply);
      return reply;
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
    let clientID = envelope.toString();
    if (!this.clientManager.verifyClient(clientID)) {
      console.error('Topic data received from unregistered client with ID ' + clientID);
      return;
    }

    let client = this.clientManager.getClient(clientID);
    client.updateLastSignOfLife();

    try {
      // Decode buffer.
      let topicDataMessage = this.topicDataTranslator.createMessageFromBuffer(message);

      // Process message.
      this.processTopicDataMessage(topicDataMessage);
    } catch (e) {
      // Create context.
      let context = {
        feedback: {
          title: '',
          message: '',
          stack: ''
        }
      };

      context.feedback.title = 'TopicData message publishing failed (ZMQ)';
      context.feedback.message = `TopicData message publishing failed (ZMQ) with an error:`;
      context.feedback.stack = '' + (e.stack || e);

      namida.error(context.feedback.title,
        context.feedback.message,
        context.feedback.stack);

      try {
        // Send error:
        this.connectionsManager.connections.topicDataZMQ.send(clientID, this.topicDataTranslator.createBufferFromPayload({
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

  onTopicDataMessageWS(clientID, message) {
    if (!this.clientManager.verifyClient(clientID)) {
      console.error('Topic data received from unregistered client with ID ' + clientID);
      return;
    }

    let client = this.clientManager.getClient(clientID);
    client.updateLastSignOfLife();

    try {
      // Decode buffer.
      let topicDataMessage = this.topicDataTranslator.createMessageFromBuffer(message);

      // Process message.
      //let clientID = this.deviceManager.getParticipant(topicDataMessage.deviceId).client.identifier;

      this.processTopicDataMessage(topicDataMessage);
    } catch (e) {
      // Create context.
      let context = {
        feedback: {
          title: '',
          message: '',
          stack: ''
        }
      };

      context.feedback.title = 'TopicData message publishing failed (WS)';
      context.feedback.message = `TopicData message publishing failed (WS) with an error:`;
      context.feedback.stack = '' + (e.stack || e);

      namida.error(context.feedback.title,
        context.feedback.message,
        context.feedback.stack);

      try {
        // Send error:
        //let topicDataMessage = this.topicDataTranslator.createMessageFromBuffer(message);
        //let clientID = this.deviceManager.getParticipant(topicDataMessage.deviceId).client.identifier;
        this.connectionsManager.send(clientID, this.topicDataTranslator.createBufferFromPayload({
          error: {
            title: context.feedback.title,
            message: context.feedback.message,
            stack: context.feedback.stack
          }
        }));
      } catch (e) {
        context.feedback.title = 'TopicData error response sending failed (WS)';
        context.feedback.message = 'TopicData error response sending failed (WS) with an error:';
        context.feedback.stack = '' + (e.stack || e);

        namida.error(context.feedback.title,
          context.feedback.message,
          context.feedback.stack);
      }
    }

    return message;
  }

  processTopicDataMessage(topicDataMessage) {
    let record = topicDataMessage.topicDataRecord;
    this.topicData.publish(record.topic, record[record.type], record.type);
  }
}

module.exports = {
  'MasterNode': MasterNode,
};