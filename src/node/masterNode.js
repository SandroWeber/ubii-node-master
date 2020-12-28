const { RuntimeTopicData } = require('@tum-far/ubii-topic-data');
const { ProtobufTranslator, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const namida = require('@tum-far/namida');

const { NetworkConnectionsManager } = require('../network/networkConnectionsManager.js');
const { ClientManager } = require('../clients/clientManager');
const { DeviceManager } = require('../devices/deviceManager');
const { ServiceManager } = require('../services/serviceManager');
const { SessionManager } = require('../sessions/sessionManager');
const ProcessingModuleManager = require('../processing/processingModuleManager');

class MasterNode {
  constructor() {
    // Translators:
    this.topicDataTranslator = new ProtobufTranslator(MSG_TYPES.TOPIC_DATA);
    this.serviceRequestTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REQUEST);
    this.serviceReplyTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REPLY);

    // Topic Data Component:
    this.topicData = new RuntimeTopicData();

    this.connectionsManager = new NetworkConnectionsManager();
    this.connectionsManager.onServiceMessageREST((...params) =>
      this.onServiceMessageREST(...params)
    );
    this.connectionsManager.onServiceMessageZMQ((...params) => this.onServiceMessageZMQ(...params));
    this.connectionsManager.onTopicDataMessageWS((...params) =>
      this.onTopicDataMessageWS(...params)
    );
    this.connectionsManager.onTopicDataMessageZMQ((...params) =>
      this.onTopicDataMessageZMQ(...params)
    );

    // Client Manager Component:
    this.clientManager = new ClientManager(this.connectionsManager, this.topicData);

    // Device Manager Component:
    this.deviceManager = new DeviceManager(
      this.clientManager,
      this.topicData,
      this.connectionsManager.connections.topicDataZMQ
    );

    this.processingModuleManager = new ProcessingModuleManager(this.deviceManager, this.topicData);

    // Session manager component:
    this.sessionManager = new SessionManager(
      this.topicData,
      this.deviceManager,
      this.processingModuleManager
    );

    // Service Manager Component:
    this.serviceManager = new ServiceManager(
      this.clientManager,
      this.deviceManager,
      this.sessionManager,
      this.connectionsManager,
      this.topicData
    );
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

      context.feedback.title = 'Service Request';
      context.feedback.message = 'processing failed with an error:';
      context.feedback.stack = '' + (e.stack.toString() || e.toString());

      namida.logFailure(
        context.feedback.title,
        context.feedback.message + '\n' + context.feedback.stack
      );

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

      context.feedback.title = 'Service Request';
      context.feedback.message = `processing failed with an error:`;
      context.feedback.stack = '' + (e.stack.toString() || e.toString());

      namida.logFailure(
        context.feedback.title,
        context.feedback.message + ' ' + context.feedback.stack
      );

      return this.serviceReplyTranslator.createBufferFromPayload({
        error: {
          title: context.feedback.title,
          message: context.feedback.message,
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

      console.error(context.feedback.message + context.feedback.stack);
      /*namida.error(context.feedback.title,
        context.feedback.message,
        context.feedback.stack);*/

      try {
        // Send error:
        this.connectionsManager.connections.topicDataZMQ.send(
          clientID,
          this.topicDataTranslator.createBufferFromPayload({
            error: {
              title: context.feedback.title,
              message: context.feedback.message,
              stack: context.feedback.stack
            }
          })
        );
      } catch (e) {
        context.feedback.title = 'TopicData error response sending failed (ZMQ)';
        context.feedback.message = `TopicData error response sending failed (ZMQ) with an error:`;
        context.feedback.stack = '' + (e.stack || e);

        namida.error(context.feedback.title, context.feedback.message, context.feedback.stack);
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

      console.error(context.feedback.message + context.feedback.stack);
      /*namida.error(context.feedback.title,
        context.feedback.message,
        context.feedback.stack);*/

      try {
        // Send error:
        //let topicDataMessage = this.topicDataTranslator.createMessageFromBuffer(message);
        //let clientID = this.deviceManager.getParticipant(topicDataMessage.deviceId).client.identifier;
        this.connectionsManager.send(
          clientID,
          this.topicDataTranslator.createBufferFromPayload({
            error: {
              title: context.feedback.title,
              message: context.feedback.message,
              stack: context.feedback.stack
            }
          })
        );
      } catch (e) {
        context.feedback.title = 'TopicData error response sending failed (WS)';
        context.feedback.message = 'TopicData error response sending failed (WS) with an error:';
        context.feedback.stack = '' + (e.stack || e);

        namida.error(context.feedback.title, context.feedback.message, context.feedback.stack);
      }
    }

    return message;
  }

  processTopicDataMessage(topicDataMessage) {
    let records = topicDataMessage.topicDataRecordList || [];
    if (topicDataMessage.topicDataRecord) records.push(topicDataMessage.topicDataRecord);
    records.forEach((record) => {
      this.topicData.publish(record.topic, record[record.type], record.type, record.timestamp);
    });
  }
}

module.exports = {
  MasterNode: MasterNode
};
