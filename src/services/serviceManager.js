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

class ServiceManager {
  constructor(clientManager, deviceManager, topicDataHost, topicDataPortZMQ, topicDataPortWS) {
    this.topicDataHost = topicDataHost;
    this.topicDataPortZMQ = topicDataPortZMQ;
    this.topicDataPortWS = topicDataPortWS;

    this.services = new Map();
    this.addService(new ClientRegistrationService(clientManager, topicDataHost, topicDataPortZMQ, topicDataPortWS));
    this.addService(new DeviceRegistrationService(clientManager, deviceManager));
    this.addService(new SubscriptionService(deviceManager));
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
    return this.services.get(request.type).reply(request[request.type]);
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
