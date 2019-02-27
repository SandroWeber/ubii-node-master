const {ClientRegistrationService} = require('./clientRegistrationService.js');
const {DeviceRegistrationService} = require('./deviceRegistrationService.js');
const {SubscriptionService} = require('./subscriptionService.js');
const {ServerConfigService} = require('./serverConfigService.js');
const {TopicListService} = require('./topicListService');
const {SessionRegistrationService} = require('./sessionRegistrationService');
const {SessionStartService} = require('./sessionStartService');
const {SessionStopService} = require('./sessionStopService');
const namida = require("@tum-far/namida");

const { ProtobufTranslator, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class ServiceManager {
  constructor(clientManager, deviceManager, connectionManager, topicData, sessionManager, host) {
    this.clientManager = clientManager;
    this.deviceManager = deviceManager;
    this.connectionManager = connectionManager;
    this.topicData = topicData;
    this.sessionManager = sessionManager;

    this.serverHost = host;

    this.serviceReplyTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REPLY);

    this.services = new Map();
    this.addService(new ClientRegistrationService(this.clientManager));
    this.addService(new DeviceRegistrationService(this.clientManager, this.deviceManager));
    this.addService(new SubscriptionService(this.clientManager));
    this.addService(new ServerConfigService('generic_server_id', 'generic_server_name', this.serverHost, connectionManager));
    this.addService(new TopicListService(this.topicData, this));
    this.addService(new SessionRegistrationService(this.sessionManager));
    this.addService(new SessionStartService(this.sessionManager));
    this.addService(new SessionStopService(this.sessionManager));
  }

  addService(service) {
    if (this.services.has(service.topic)) {
      namida.warn('Service already registered',
        'Service for topic "' + service.topic + '" already registered.');
      return;
    }

    this.services.set(service.topic, service);
  }

  removeService(topic) {
    this.services.delete(topic);
  }

  processRequest(request) {
    if (!request.topic) {
      console.error('ServiceManager.processRequest() - request missing topic! request:');
      console.error(request);
      return this.serviceReplyTranslator.createBufferFromPayload({
        error: {
          title: 'Service request error',
          message: 'Request does not contain a topic',
          stack: JSON.stringify(request)
        }
      });
    }

    return this.services.get(request.topic).reply(request[request.type]);
  }

  getTopicList() {
    let list = [];
    this.services.forEach((service, topic) => {
      list.push(topic);
    });

    return list;
  }
}

module.exports = {
  ServiceManager
};
