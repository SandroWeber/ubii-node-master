const { ClientRegistrationService } = require('./clientRegistrationService.js');
const { ClientDeregistrationService } = require('./clientDeregistrationService.js');
const { DeviceRegistrationService } = require('./devices/deviceRegistrationService.js');
const { DeviceDeregistrationService } = require('./devices/deviceDeregistrationService.js');
const { InteractionDeleteService } = require('./interactions/interactionDeleteService.js');
const { InteractionDatabaseGetListService } = require('./interactions/interactionDatabaseGetListService.js');
const { InteractionDatabaseGetService } = require('./interactions/interactionDatabaseGetService.js');
const { InteractionRegistrationService } = require('./interactions/interactionRegistrationService.js');
const { InteractionReplaceService } = require('./interactions/interactionReplaceService.js');
const { SubscriptionService } = require('./subscriptionService.js');
const { ServerConfigService } = require('./serverConfigService.js');
const { TopicListService } = require('./topicListService');
const { SessionDeleteService } = require('./sessions/sessionDeleteService.js');
const { SessionDatabaseGetListService } = require('./sessions/sessionDatabaseGetListService.js');
const { SessionDatabaseGetService } = require('./sessions/sessionDatabaseGetService.js');
const { SessionRuntimeGetListService } = require('./sessions/sessionRuntimeGetListService.js');
const { SessionRuntimeGetService } = require('./sessions/sessionRuntimeGetService.js');
const { SessionRegistrationService } = require('./sessions/sessionRegistrationService.js');
const { SessionReplaceService } = require('./sessions/sessionReplaceService.js');
const { SessionStartService } = require('./sessions/sessionStartService');
const { SessionStopService } = require('./sessions/sessionStopService');
const namida = require("@tum-far/namida");

const { ProtobufTranslator, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class ServiceManager {
  constructor(clientManager, deviceManager, connectionManager, topicData, sessionManager) {
    this.clientManager = clientManager;
    this.deviceManager = deviceManager;
    this.connectionManager = connectionManager;
    this.topicData = topicData;
    this.sessionManager = sessionManager;

    this.serviceReplyTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REPLY);

    this.services = new Map();
    /* add general services */
    this.addService(new SubscriptionService(this.clientManager));
    this.addService(new ServerConfigService('generic_server_id', 'generic_server_name', this.connectionManager));
    this.addService(new TopicListService(this.topicData, this));
    /* add client services */
    this.addService(new ClientRegistrationService(this.clientManager));
    this.addService(new ClientDeregistrationService(this.clientManager, this.deviceManager));
    /* add device services */
    this.addService(new DeviceRegistrationService(this.clientManager, this.deviceManager));
    this.addService(new DeviceDeregistrationService(this.clientManager, this.deviceManager));
    /* add interaction services */
    this.addService(new InteractionDeleteService());
    this.addService(new InteractionDatabaseGetListService());
    this.addService(new InteractionDatabaseGetService());
    this.addService(new InteractionRegistrationService());
    this.addService(new InteractionReplaceService());
    /* add session services */
    this.addService(new SessionDeleteService());
    this.addService(new SessionDatabaseGetListService());
    this.addService(new SessionDatabaseGetService());
    this.addService(new SessionRuntimeGetListService(this.sessionManager));
    this.addService(new SessionRuntimeGetService(this.sessionManager));
    this.addService(new SessionRegistrationService(this.sessionManager));
    this.addService(new SessionReplaceService());
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
