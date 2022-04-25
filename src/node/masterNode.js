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
    namida.logSuccess('MasterNode', 'ID ' + this.id);

    // Translators:
    this.topicDataTranslator = new ProtobufTranslator(MSG_TYPES.TOPIC_DATA);
    this.serviceRequestTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REQUEST);
    this.serviceReplyTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REPLY);

    // Topic Data Component:
    this.topicData = new RuntimeTopicData();

    // network connections manager
    this.connectionsManager = NetworkConnectionsManager.instance;
    this.connectionsManager.openConnections();
    this.connectionsManager.setServiceRouteHTTP('/services/json', (...params) => this.onServiceMessageRestJson(...params));
    this.connectionsManager.setServiceRouteHTTP('/services/binary', (...params) => this.onServiceMessageRestBinary(...params));
    this.connectionsManager.onServiceMessageZMQ((...params) => this.onServiceMessageZMQ(...params));
    this.connectionsManager.onTopicDataMessageWS((...params) => this.onTopicDataMessage(...params));
    this.connectionsManager.onTopicDataMessageZMQ((envelope, message) =>
      this.onTopicDataMessage(envelope.toString(), message)
    );

    // Client Manager Component:
    ClientManager.instance.setDependencies(this.connectionsManager, this.topicData);

    // Device Manager Component:
    DeviceManager.instance.setTopicData(this.topicData);

    // PM Manager Component:
    this.processingModuleManager = new ProcessingModuleManager(this.id, this.topicData);

    // Session manager component:
    SessionManager.instance.setDependencies(this.id, this.topicData, this.processingModuleManager);

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

  onServiceMessageRestJson(request, response) {
    try {
      let requestMessage = this.serviceRequestTranslator.proto.fromObject(request.body);
      this.serviceRequestTranslator.verify(requestMessage);

      let reply = ServiceManager.instance.processRequest(requestMessage);
      let proto = this.serviceReplyTranslator.proto.fromObject(reply);
      if (!this.serviceReplyTranslator.verify(proto)) {
        namida.logFailure(
          'onServiceMessageRestJson()',
          'service reply seems malformed, verification failed. reply:\n' + reply
        );
      }

      response.json(proto);
      return proto;
    } catch (error) {
      let errorMessage = this.onServiceResponseError(error);
      response.json(errorMessage);
      return errorMsg;
    }
  }

  onServiceMessageRestBinary(request, response) {
    try {
      let requestBuffer = new Uint8Array(request.body);
      let requestMessage = this.serviceRequestTranslator.createMessageFromBuffer(requestBuffer);

      let reply = ServiceManager.instance.processRequest(requestMessage);
      let replyBuffer = this.serviceReplyTranslator.createBufferFromMessage(reply);
      response.send(replyBuffer);

      return reply;
    } catch (error) {
      let errorMessage = this.onServiceResponseError(error);
      response.send(this.serviceReplyTranslator.createBufferFromPayload(errorMessage));
      return errorMessage;
    }
  }

  onServiceResponseError(error) {
    let title = 'Service Request';
    let message = `processing failed with an error:`;
    let stack = '' + (error.stack.toString() || error.toString());

    namida.logFailure(title, message + '\n' + stack);

    return {
      error: {
        title: title,
        message: message,
        stack: stack
      }
    };
  }

  onTopicDataMessage(clientID, message) {
    if (!ClientManager.instance.verifyClient(clientID)) {
      namida.logFailure('Topic data received from unregistered client with ID ' + clientID);
      return;
    }

    let client = ClientManager.instance.getClient(clientID);
    client.updateLastSignOfLife();

    try {
      // Decode buffer.
      let topicDataMessage = this.topicDataTranslator.createPayloadFromBuffer(message);

      // Process message.
      this.processTopicDataMessage(topicDataMessage, clientID);
    } catch (error) {
      let title = 'TopicData reception failed (Client ID ' + clientID + ')';
      let message = 'error stack:';
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
      } catch (error) {
        title = 'TopicData error response sending failed (Client ID ' + clientID + ')';
        message = 'error stack:';
        stack = '' + (error.stack || error);

        namida.logFailure(title, message + '\n' + stack);
      }
    }

    return message;
  }

  processTopicDataMessage(topicDataMessage, clientID) {
    let client = ClientManager.instance.getClient(clientID);

    let records = topicDataMessage.topicDataRecordList ? topicDataMessage.topicDataRecordList.elements : [];
    if (topicDataMessage.topicDataRecord) records.push(topicDataMessage.topicDataRecord);

    records.forEach((record) => {
      let topic = record.topic;
      // confirm that the client is the rightful publisher of this topic
      //TODO: smarter behaviour, only PUBLISHER components that are registered by other clients block publishing on the same topic
      /*if (!client.publishedTopics.includes(topic)) {
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
      }*/
      if (!client.publishedTopics.includes(topic) && !this.topicData.hasData(topic)) {
        client.publishedTopics.push(topic);
      }

      this.topicData.publish(record.topic, record);
    });
  }
}

module.exports = {
  MasterNode: MasterNode
};
