const { v4: uuidv4 } = require('uuid');
const { RuntimeTopicData } = require('@tum-far/ubii-topic-data');
const { ProtobufTranslator, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const namida = require('@tum-far/namida');
const { NetworkConnectionsManager, ProcessingModuleManager } = require('@tum-far/ubii-node-nodejs/src/index');

const { ClientManager } = require('../clients/clientManager');
const { DeviceManager } = require('../devices/deviceManager');
const { ServiceManager } = require('../services/serviceManager');
const { SessionManager } = require('../sessions/sessionManager');

class MasterNode {
  constructor() {
    this.id = uuidv4();

    // Translators:
    this.topicDataTranslator = new ProtobufTranslator(MSG_TYPES.TOPIC_DATA);
    this.serviceRequestTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REQUEST);
    this.serviceReplyTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REPLY);

    // Topic Data Component:
    this.topicData = new RuntimeTopicData();

    // network connections manager
    this.connectionsManager = NetworkConnectionsManager.instance;
    this.connectionsManager.openConnections();
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
    ClientManager.instance.setDependencies(this.connectionsManager, this.topicData);

    // Device Manager Component:
    DeviceManager.instance.setTopicData(this.topicData);

    // PM Manager Component:
    this.processingModuleManager = new ProcessingModuleManager(
      this.id,
      DeviceManager.instance,
      this.topicData
    );

    // Session manager component:
    SessionManager.instance.setDependencies(
      this.id,
      this.topicData,
      this.processingModuleManager
    );

    // Service Manager Component:
    ServiceManager.instance.setDependencies(
      this.id,
      this.connectionsManager,
      this.processingModuleManager,
      this.topicData
    );
    ServiceManager.instance.addDefaultServices();
  }

  onServiceMessageZMQ(message) {
    try {
      // Decode buffer.
      let request = this.serviceRequestTranslator.createMessageFromBuffer(message);
      // Process request.
      let reply = ServiceManager.instance.processRequest(request);

      // Return reply.
      return this.serviceReplyTranslator.createBufferFromPayload(reply);
    } catch (error) {
      let title = 'Service Request';
      let message = 'processing failed with an error:';
      let stack = '' + (error.stack.toString() || error.toString());

      namida.logFailure(title, message + '\n' + stack);

      return this.serviceReplyTranslator.createBufferFromPayload({
        error: {
          title: title,
          message: message,
          stack: stack
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
      let reply = ServiceManager.instance.processRequest(requestMessage);

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
    } catch (error) {
      let title = 'Service Request';
      let message = `processing failed with an error:`;
      let stack = '' + (error.stack.toString() || error.toString());

      namida.logFailure(title, message + '\n' + stack);

      return this.serviceReplyTranslator.createBufferFromPayload({
        error: {
          title: title,
          message: message,
          stack: stack
        }
      });
    }
  }

  onTopicDataMessageZMQ(envelope, message) {
    let clientID = envelope.toString();
    if (!ClientManager.instance.verifyClient(clientID)) {
      console.error('Topic data received from unregistered client with ID ' + clientID);
      return;
    }

    let client = ClientManager.instance.getClient(clientID);
    client.updateLastSignOfLife();

    try {
      // Decode buffer.
      let topicDataMessage = this.topicDataTranslator.createMessageFromBuffer(message);

      // Process message.
      this.processTopicDataMessage(topicDataMessage, clientID);
    } catch (error) {
      let title = 'TopicData message publishing failed (ZMQ)';
      let message = `TopicData message publishing failed (ZMQ) with an error:`;
      let stack = '' + (error.stack || error);

      namida.logFailure(title, message + '\n' + stack);

      try {
        // Send error:
        this.connectionsManager.connections.topicDataZMQ.send(
          clientID,
          this.topicDataTranslator.createBufferFromPayload({
            error: {
              title: title,
              message: message,
              stack: stack
            }
          })
        );
      } catch (error) {
        title = 'TopicData error response sending failed (ZMQ)';
        message = `TopicData error response sending failed (ZMQ) with an error:`;
        stack = '' + (error.stack || error);

        namida.logFailure(title, message + '\n' + stack);
      }
    }

    return message;
  }

  onTopicDataMessageWS(clientID, message) {
    if (!ClientManager.instance.verifyClient(clientID)) {
      console.error('Topic data received from unregistered client with ID ' + clientID);
      return;
    }

    let client = ClientManager.instance.getClient(clientID);
    client.updateLastSignOfLife();

    try {
      // Decode buffer.
      let topicDataMessage = this.topicDataTranslator.createMessageFromBuffer(message);

      this.processTopicDataMessage(topicDataMessage, clientID);
    } catch (error) {
      let title = 'TopicData message publishing failed (WS)';
      let message = `TopicData message publishing failed (WS) with an error:`;
      let stack = '' + (error.stack || error);

      namida.logFailure(title, message + '\n' + stack);

      try {
        this.connectionsManager.send(
          clientID,
          this.topicDataTranslator.createBufferFromPayload({
            error: {
              title: title,
              message: message,
              stack: stack
            }
          })
        );
      } catch (e) {
        title = 'TopicData error response sending failed (WS)';
        message = 'TopicData error response sending failed (WS) with an error:';
        stack = '' + (e.stack || e);

        namida.logFailure(title, message + '\n' + stack);
      }
    }

    return message;
  }

  processTopicDataMessage(topicDataMessage, clientID) {
    let client = ClientManager.instance.getClient(clientID);

    let records = topicDataMessage.topicDataRecordList
      ? topicDataMessage.topicDataRecordList.elements
      : [];
    if (topicDataMessage.topicDataRecord) records.push(topicDataMessage.topicDataRecord);

    records.forEach((record) => {
      let topic = record.topic;
      // confirm that the client is the rightful publisher of this topic
      if (!client.publishedTopics.includes(topic)) {
        let topicHasData = this.topicData.hasData(topic);

        if (!topicHasData) {
          client.publishedTopics.push(topic);
        } else {
          namida.logFailure(
            'TopicData message',
            client.toString() + ' is not the original publisher of ' + topic
          );
          return;
        }
      }

      this.topicData.publish(record.topic, record);
    });
  }
}

module.exports = {
  MasterNode: MasterNode
};
