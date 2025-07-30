const { v4: uuidv4 } = require('uuid');
const { RuntimeTopicData } = require('@tum-far/ubii-topic-data');
const { ProtobufTranslator, MSG_TYPES, DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');
const { ProcessingModuleManager, ConfigService, LoggingService } = require('@tum-far/ubii-node-nodejs');

const NetworkConnectionsManager = require('../network/networkConnectionsManager');
const { ClientManager } = require('../clients/clientManager');
const DeviceManager = require('../devices/deviceManager');
const { ServiceManager } = require('../services/serviceManager');
const { SessionManager } = require('../sessions/sessionManager');
const { Profiler } = require('../profiling/profiler');
const NotifyConditionManager = require('../conditions/notifyConditionManager');
const TopicDataProxy = require('./topicDataProxy');
const Utils = require('../utils/utilities');

const MASTER_NODE_CONSTANTS = require('./constants');

const logger = LoggingService.instance.logger;
const LOG_TAG = '[UBII MasterNode]';

class MasterNode {
  constructor() {
    this.id = uuidv4();
    this.logger = logger;
  }

  init() {
    logger.info({ label: LOG_TAG, message: 'ID ' + this.id });

    // Translators:
    this.topicDataTranslator = new ProtobufTranslator(MSG_TYPES.TOPIC_DATA);
    this.serviceRequestTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REQUEST);
    this.serviceReplyTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REPLY);

    // Topic Data Component:
    this.topicDataBuffer = new RuntimeTopicData();
    this.topicDataProxy = new TopicDataProxy(this.topicDataBuffer);
    this.deviceManager = new DeviceManager();
    this.deviceManager.on(DeviceManager.EVENTS.NEW_DEVICE, (deviceSpecs) => this.onNewDevice(deviceSpecs));

    this.notifyConditionManager = new NotifyConditionManager(this.topicDataBuffer, this.deviceManager);

    // network connections manager
    this.connectionsManager = NetworkConnectionsManager.instance;
    this.connectionsManager.openConnections();
    this.connectionsManager.setServiceRouteHTTP('/ubii/services/json', (...params) =>
      this.onServiceMessageRestJson(...params)
    );
    this.connectionsManager.setServiceRouteHTTP('/ubii/services/binary', (...params) =>
      this.onServiceMessageRestBinary(...params)
    );
    this.connectionsManager.setCallbackServiceMessageZMQ((...params) => this.onServiceMessageZMQ(...params));
    this.connectionsManager.setCallbackOnTopicDataWS((...params) => this.onTopicDataMessage(...params));
    this.connectionsManager.setCallbackOnTopicDataZMQ((envelope, message) =>
      this.onTopicDataMessage(envelope.toString(), message)
    );

    // Client Manager Component:
    ClientManager.instance.setDependencies(this.connectionsManager, this.topicDataBuffer, this.deviceManager);

    // Device Manager Component:
    this.deviceManager.setDependencies(this);

    // PM Manager Component:
    this.processingModuleManager = new ProcessingModuleManager(this.id, this.topicDataProxy);

    // Session manager component:
    SessionManager.instance.setDependencies(
      this.id,
      this.topicDataBuffer,
      this.processingModuleManager,
      this.deviceManager
    );

    // Service Manager Component:
    ServiceManager.instance.setDependencies(
      this.id,
      this.connectionsManager,
      this.processingModuleManager,
      this.topicDataBuffer,
      this.deviceManager,
      this.notifyConditionManager
    );
    ServiceManager.instance.addDefaultServices();

    this.profilingConfig = ConfigService.instance.config.profiling;
    if (this.profilingConfig && this.profilingConfig.enabled) {
      this.profiler = new Profiler(this, this.connectionsManager);
    }
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
      let stack = '' + (error.stack.toString() || error.toString());
      logger.error({ label: LOG_TAG, message: 'ServiceRequest processing failed with an error: ' + '\n' + stack });

      return this.serviceReplyTranslator.createBufferFromPayload({
        error: {
          title: LOG_TAG,
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
      let proto = this.serviceReplyTranslator.fromObject(reply);

      response.json(proto);
      return proto;
    } catch (error) {
      let errorMessage = this.onServiceResponseError(error);
      response.json(errorMessage);
      return errorMessage;
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

    logger.error({ label: LOG_TAG, message: message + '\n' + stack });

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
      logger.error({ label: LOG_TAG, message: 'Topic data received from unregistered client with ID ' + clientID });
      return;
    }

    try {
      // Decode buffer.
      let topicDataMessage = this.topicDataTranslator.createPayloadFromBuffer(message);

      // Process message.
      this.processTopicDataMessage(topicDataMessage, clientID);
    } catch (error) {
      let stack = '' + (error.stack || error);
      logger.error({
        label: LOG_TAG,
        message: 'TopicData reception failed (Client ID ' + clientID + '), error stack:\n' + stack
      });

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
        stack = '' + (error.stack || error);
        logger.error({
          label: LOG_TAG,
          message: 'TopicData error response sending failed (Client ID ' + clientID + '), error stack:\n' + stack
        });
      }
    }

    return message;
  }

  processTopicDataMessage(topicDataMessage, clientID) {
    let client = ClientManager.instance.getClient(clientID);
    //client.updateLastSignOfLife();

    let records =
      topicDataMessage.topicDataRecordList && topicDataMessage.topicDataRecordList.elements
        ? topicDataMessage.topicDataRecordList.elements
        : [];
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
          return;
        }
      }*/
      if (!client.publishedTopics.includes(topic) && !this.topicDataBuffer.hasData(topic)) {
        client.publishedTopics.push(topic);
      }

      this.publishRecord(record, clientID);
    });
  }

  publishRecord(record, nodeId) {
    record.tReceived = Date.now();
    !nodeId &&
      logger.warn({
        label: LOG_TAG,
        message: 'publishRecord() - no client ID: ' + nodeId
      });
    this.topicDataBuffer.publish(record.topic, record, nodeId);
  }

  getDependency(depIdentifier) {
    let dependency = undefined;
    if (depIdentifier === MASTER_NODE_CONSTANTS.TOPIC_DATA_BUFFER) {
      dependency = this.topicDataBuffer;
    } else if (depIdentifier === MASTER_NODE_CONSTANTS.MANAGERS.DEVICES) {
      returndependency = this.deviceManager;
    } else if (depIdentifier === MASTER_NODE_CONSTANTS.MANAGERS.CLIENTS) {
      dependency = ClientManager.instance;
    } else if (depIdentifier === MASTER_NODE_CONSTANTS.MANAGERS.NOTIFY_CONDITIONS) {
      dependency = this.notifyConditionManager;
    }
    if (!dependency) {
      logger.error({ label: LOG_TAG, message: `could not find dependency for "${depIdentifier}"` });
    }

    return dependency;
  }

  onNewDevice(specs) {
    this.publishRecord(
      {
        topic: DEFAULT_TOPICS.INFO_TOPICS.NEW_DEVICE,
        type: Utils.getTopicDataTypeFromMessageFormat(MSG_TYPES.DEVICE),
        device: specs
      },
      this.id
    );
  }
}

module.exports = {
  MasterNode: MasterNode
};
