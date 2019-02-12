const {
  ClientRegistrationService
} = require('../services/clientRegistrationService.js');
const {
  DeviceRegistrationService
} = require('../services/deviceRegistrationService.js');
const {
  SubscriptionService
} = require('../services/subscriptionService.js');
const namida = require("@tum-far/namida");

const { ProtobufTranslator } = require('@tum-far/ubii-msg-formats');

class ServiceManager {
  constructor(clientManager, deviceManager, topicDataHost, topicDataPortZMQ, topicDataPortWS) {
    this.clientManager = clientManager;
    this.deviceManager = deviceManager;

    this.topicDataHost = topicDataHost;
    this.topicDataPortZMQ = topicDataPortZMQ;
    this.topicDataPortWS = topicDataPortWS;

    this.msgTypeServiceReply = 'ubii.service.ServiceReply';
    this.serviceReplyTranslator = new ProtobufTranslator(this.msgTypeServiceReply);

    this.services = new Map();
    this.addService(new ClientRegistrationService(this.clientManager, this.topicDataHost, this.topicDataPortZMQ, this.topicDataPortWS));
    this.addService(new DeviceRegistrationService(this.clientManager, this.deviceManager));
    this.addService(new SubscriptionService(this.deviceManager));
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
      console.error('ServiceManager.processRequest() - request missing topic! request:\n' + request);
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
