const {ClientRegistrationService} = require('../services/clientRegistrationService.js');
const {DeviceRegistrationService} = require('../services/deviceRegistrationService.js');
const {SubscriptionService} = require('../services/subscriptionService.js');
const {ServerConfigService} = require('../services/serverConfigService.js');
const namida = require("@tum-far/namida");

const { ProtobufTranslator, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class ServiceManager {
  constructor(clientManager, deviceManager, connectionManager, host) {
    this.clientManager = clientManager;
    this.deviceManager = deviceManager;
    this.connectionManager = connectionManager;

    this.host = host;

    this.serviceReplyTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REPLY);

    this.services = new Map();
    this.addService(new ClientRegistrationService(this.clientManager, this.host,
      this.connectionManager.ports.topicDataZMQ,
      this.connectionManager.ports.topicDataWS));
    this.addService(new DeviceRegistrationService(this.clientManager, this.deviceManager));
    this.addService(new SubscriptionService(this.deviceManager));
    this.addService(new ServerConfigService('generic_server_id', 'generic_server_name', this.host, connectionManager));
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
