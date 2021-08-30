const { ClientRegistrationService } = require('./clients/clientRegistrationService.js');
const { ClientDeregistrationService } = require('./clients/clientDeregistrationService.js');
const { ClientListService } = require('./clients/clientListService.js');
const { DeviceRegistrationService } = require('./devices/deviceRegistrationService.js');
const { DeviceDeregistrationService } = require('./devices/deviceDeregistrationService.js');
const { DeviceListService } = require('./devices/deviceListService.js');
const ProcessingModuleGetService = require('./processing/pmDatabaseGetService.js');
const ProcessingModuleGetListService = require('./processing/pmDatabaseGetListService.js');
const ProcessingModuleRuntimeAddService = require('./processing/pmRuntimeAddService.js');
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
const { NetworkInfoService } = require('./networkInfo/networkInfoService')
const namida = require('@tum-far/namida');

const { ProtobufTranslator, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class ServiceManager {
  constructor(
    nodeID,
    clientManager,
    deviceManager,
    sessionManager,
    connectionsManager,
    processingModuleManager,
    topicData
  ) {
    this.clientManager = clientManager;
    this.deviceManager = deviceManager;
    this.sessionManager = sessionManager;
    this.connectionsManager = connectionsManager;
    this.processingModuleManager = processingModuleManager;
    this.topicData = topicData;

    this.serviceReplyTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REPLY);

    this.services = new Map();
    /* add general services */
    this.addService(new SubscriptionService(this.clientManager, this.topicData));
    this.addService(new ServerConfigService(nodeID, 'master-node', this.connectionsManager));
    this.addService(new TopicListService(this.topicData, this));
    this.addService(new ServiceListService(this));
    /* add client services */
    this.addService(new ClientRegistrationService(this.clientManager));
    this.addService(new ClientDeregistrationService(this.clientManager, this.deviceManager));
    this.addService(new ClientListService(this.clientManager));
    /* add device services */
    this.addService(new DeviceRegistrationService(this.deviceManager));
    this.addService(new DeviceDeregistrationService(this.deviceManager));
    this.addService(new DeviceListService(this.deviceManager, this.clientManager));
    /* add processing module services */
    this.addService(ProcessingModuleGetService);
    this.addService(new ProcessingModuleGetListService(this.processingModuleManager));
    this.addService(
      new ProcessingModuleRuntimeAddService(this.processingModuleManager, this.sessionManager)
    );
    /* add session services */
    this.addService(new SessionDatabaseDeleteService());
    this.addService(new SessionDatabaseGetListService());
    this.addService(new SessionDatabaseGetService());
    this.addService(new SessionRuntimeGetListService(this.sessionManager));
    this.addService(new SessionRuntimeGetService(this.sessionManager));
    this.addService(new SessionDatabaseSaveService(this.sessionManager));
    this.addService(new SessionStartService(this.sessionManager));
    this.addService(new SessionStopService(this.sessionManager));
    /* network statistics */
    this.addService(new NetworkInfoService(this.clientManager));
  }

  addService(service) {
    if (!service.topic) {
      namida.logFailure(
        'Service Manager',
        'can not add service, no topic: ' + service.constructor.name
      );
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
        'request is missing topic! request:\n' + JSON.stringify(request)
      );

      return this.serviceReplyTranslator.createBufferFromPayload({
        error: {
          title: 'Service request error',
          message: 'Request does not contain a topic',
          stack: JSON.stringify(request)
        }
      });
    }

    if (!this.services.has(request.topic)) {
      namida.logFailure(
        'ServiceManager',
        'no service for topic "' + request.topic + '" registered! request:\n' + JSON.stringify(request)
      );

      return this.serviceReplyTranslator.createBufferFromPayload({
        error: {
          title: 'Service request error',
          message: 'unknown topic: ' + request.topic,
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
