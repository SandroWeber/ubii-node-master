const { ClientRegistrationService } = require('./clientRegistrationService.js');
const { ClientDeregistrationService } = require('./clientDeregistrationService.js');
const { DeviceRegistrationService } = require('./devices/deviceRegistrationService.js');
const { DeviceDeregistrationService } = require('./devices/deviceDeregistrationService.js');
const { DeviceListService } = require('./devices/deviceListService.js');
const {
  InteractionDatabaseDeleteService
} = require('./interactions/interactionDatabaseDeleteService.js');
const {
  InteractionDatabaseGetListService
} = require('./interactions/interactionDatabaseGetListService.js');
const {
  InteractionOnlineDatabaseGetListService
} = require('./interactions/interactionOnlineDatabaseGetListService');
const {
  InteractionLocalDatabaseGetListService
} = require('./interactions/interactionLocalDatabaseGetListService');
const {
  InteractionDatabaseGetService
} = require('./interactions/interactionDatabaseGetService.js');
const {
  InteractionDatabaseSaveService
} = require('./interactions/interactionDatabaseSaveService.js');
const { SubscriptionService } = require('./subscriptionService.js');
const { ServerConfigService } = require('./serverConfigService.js');
const { TopicListService } = require('./topicListService');
const { ServiceListService } = require('./serviceListService');
const { SessionDatabaseDeleteService } = require('./sessions/sessionDatabaseDeleteService.js');
const { SessionDatabaseGetListService } = require('./sessions/sessionDatabaseGetListService.js');
const { SessionDatabaseGetService } = require('./sessions/sessionDatabaseGetService.js');
const { SessionRuntimeGetListService } = require('./sessions/sessionRuntimeGetListService.js');
const { SessionRuntimeGetService } = require('./sessions/sessionRuntimeGetService.js');
const { SessionDatabaseSaveService } = require('./sessions/sessionDatabaseSaveService.js');
const { SessionStartService } = require('./sessions/sessionStartService');
const { SessionStopService } = require('./sessions/sessionStopService');
const namida = require('@tum-far/namida');

const { ProtobufTranslator, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class ServiceManager {
  constructor(clientManager, deviceManager, sessionManager, connectionsManager, topicData) {
    this.clientManager = clientManager;
    this.deviceManager = deviceManager;
    this.sessionManager = sessionManager;
    this.connectionsManager = connectionsManager;
    this.topicData = topicData;

    this.serviceReplyTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REPLY);

    this.services = new Map();
    /* add general services */
    this.addService(new SubscriptionService(this.clientManager, this.topicData));
    this.addService(
      new ServerConfigService('generic_server_id', 'generic_server_name', this.connectionsManager)
    );
    this.addService(new TopicListService(this.topicData, this));
    this.addService(new ServiceListService(this));
    /* add client services */
    this.addService(new ClientRegistrationService(this.clientManager));
    this.addService(new ClientDeregistrationService(this.clientManager, this.deviceManager));
    /* add device services */
    this.addService(new DeviceRegistrationService(this.clientManager, this.deviceManager));
    this.addService(new DeviceDeregistrationService(this.clientManager, this.deviceManager));
    this.addService(new DeviceListService(this.deviceManager));
    /* add interaction services */
    this.addService(new InteractionDatabaseDeleteService());
    this.addService(new InteractionDatabaseGetListService());
    this.addService(new InteractionOnlineDatabaseGetListService());
    this.addService(new InteractionLocalDatabaseGetListService());
    this.addService(new InteractionDatabaseGetService());
    this.addService(new InteractionDatabaseSaveService());
    /* add session services */
    this.addService(new SessionDatabaseDeleteService());
    this.addService(new SessionDatabaseGetListService());
    this.addService(new SessionDatabaseGetService());
    this.addService(new SessionRuntimeGetListService(this.sessionManager));
    this.addService(new SessionRuntimeGetService(this.sessionManager));
    this.addService(new SessionDatabaseSaveService(this.sessionManager));
    this.addService(new SessionStartService(this.sessionManager));
    this.addService(new SessionStopService(this.sessionManager));
  }

  addService(service) {
    if (!service.topic) {
      namida.error('Service topic error', 'Service topic: ' + service.topic, service);
      return;
    }

    if (this.services.has(service.topic)) {
      namida.warn(
        'Service already registered',
        'Service for topic "' + service.topic + '" already registered.'
      );
      return;
    }

    this.services.set(service.topic, service);
  }

  removeService(topic) {
    this.services.delete(topic);
  }

  processRequest(request) {
    if (!request.topic) {
      namida.logFailure(
        'ServiceManager',
        'request missing topic! request:\n' + JSON.stringify(request)
      );

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

  getServiceListProtoSpecs() {
    let list = [];
    this.services.forEach((service, topic) => {
      list.push(service.toProtobuf());
    });

    return list;
  }
}

module.exports = {
  ServiceManager
};
