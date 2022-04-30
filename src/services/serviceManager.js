const namida = require('@tum-far/namida');

const { ClientRegistrationService } = require('./clients/clientRegistrationService.js');
const { ClientDeregistrationService } = require('./clients/clientDeregistrationService.js');
const { ClientListService } = require('./clients/clientListService.js');
const { DeviceRegistrationService } = require('./devices/deviceRegistrationService.js');
const { DeviceDeregistrationService } = require('./devices/deviceDeregistrationService.js');
const { DeviceListService } = require('./devices/deviceListService.js');
const ComponentGetListService = require('./devices/componentGetListService');
const ProcessingModuleDatabaseGetService = require('./processing/pmDatabaseGetService.js');
const ProcessingModuleDatabaseGetListService = require('./processing/pmDatabaseGetListService.js');
const ProcessingModuleRuntimeAddService = require('./processing/pmRuntimeAddService.js');
const ProcessingModuleRuntimeRemoveService = require('./processing/pmRuntimeRemoveService');
const { SubscriptionService } = require('./subscriptionService.js');
const { ServerConfigService } = require('./serverConfigService.js');
const { TopicListService } = require('./topicListService');
const { ServiceListService } = require('./serviceListService');
const { SessionDatabaseDeleteService } = require('./sessions/sessionDatabaseDeleteService.js');
const { SessionDatabaseGetListService } = require('./sessions/sessionDatabaseGetListService.js');
const { SessionDatabaseGetService } = require('./sessions/sessionDatabaseGetService.js');
const { SessionRuntimeGetListService } = require('./sessions/sessionRuntimeGetListService.js');
const { SessionRuntimeGetService } = require('./sessions/sessionRuntimeGetService.js');
const { SessionRuntimeAddService } = require('./sessions/sessionRuntimeAddService');
const { SessionDatabaseSaveService } = require('./sessions/sessionDatabaseSaveService.js');
const { SessionRuntimeStartService } = require('./sessions/sessionRuntimeStartService');
const { SessionRuntimeStopService } = require('./sessions/sessionRuntimeStopService');
const { NetworkInfoService } = require('./networkInfo/networkInfoService.js');

const { ClientManager } = require('../clients/clientManager');
const { DeviceManager } = require('../devices/deviceManager');
const { SessionManager } = require('../sessions/sessionManager');

const { ProtobufTranslator, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

let _instance = null;
const SINGLETON_ENFORCER = Symbol();

class ServiceManager {
  constructor(enforcer) {
    if (enforcer !== SINGLETON_ENFORCER) {
      throw new Error('Use ' + this.constructor.name + '.instance');
    }

    this.serviceReplyTranslator = new ProtobufTranslator(MSG_TYPES.SERVICE_REPLY);

    this.services = new Map();
  }

  static get instance() {
    if (_instance == null) {
      _instance = new ServiceManager(SINGLETON_ENFORCER);
    }

    return _instance;
  }

  setDependencies(masterNodeID, connectionsManager, processingModuleManager, topicData) {
    this.masterNodeID = masterNodeID;
    this.connectionsManager = connectionsManager;
    this.processingModuleManager = processingModuleManager;
    this.topicData = topicData;
  }

  addDefaultServices() {
    /* add general services */
    this.addService(new SubscriptionService(ClientManager.instance, this.topicData));
    this.addService(new ServerConfigService(this.masterNodeID, 'master-node', this.connectionsManager));
    this.addService(new TopicListService(this, this.topicData));
    this.addService(new ServiceListService(this));
    /* add client services */
    this.addService(new ClientRegistrationService(ClientManager.instance));
    this.addService(new ClientDeregistrationService(ClientManager.instance, DeviceManager.instance));
    this.addService(new ClientListService(ClientManager.instance));
    /* add device services */
    this.addService(new DeviceRegistrationService(DeviceManager.instance));
    this.addService(new DeviceDeregistrationService(DeviceManager.instance));
    this.addService(new DeviceListService(DeviceManager.instance, ClientManager.instance));
    this.addService(new ComponentGetListService());
    /* add processing module services */
    this.addService(new ProcessingModuleDatabaseGetService());
    this.addService(new ProcessingModuleDatabaseGetListService(ClientManager.instance));
    this.addService(new ProcessingModuleRuntimeAddService(this.processingModuleManager, SessionManager.instance));
    this.addService(new ProcessingModuleRuntimeRemoveService(this.processingModuleManager, SessionManager.instance));
    /* add session services */
    this.addService(new SessionDatabaseDeleteService());
    this.addService(new SessionDatabaseGetListService());
    this.addService(new SessionDatabaseGetService());
    this.addService(new SessionRuntimeGetListService(SessionManager.instance));
    this.addService(new SessionRuntimeGetService(SessionManager.instance));
    this.addService(new SessionRuntimeAddService());
    this.addService(new SessionDatabaseSaveService(SessionManager.instance));
    this.addService(new SessionRuntimeStartService(SessionManager.instance));
    this.addService(new SessionRuntimeStopService(SessionManager.instance));

    /* network statistics */
    this.addService(new NetworkInfoService(ClientManager.instance));
  }

  addService(service) {
    if (!service.topic) {
      namida.logFailure(
        'Service Manager',
        'can not add service of class "' + service.prototype.constructor.name + '", no topic specified'
      );
      return;
    }

    if (this.services.has(service.topic)) {
      namida.warn('Service already registered', 'Service for topic "' + service.topic + '" already registered.');
      return;
    }

    this.services.set(service.topic, service);
  }

  removeService(topic) {
    this.services.delete(topic);
  }

  processRequest(request) {
    if (!request.topic) {
      namida.logFailure('ServiceManager', 'request is missing topic! request:\n' + JSON.stringify(request));

      return {
        error: {
          title: 'Service request error',
          message: 'Request does not contain a topic',
          stack: JSON.stringify(request)
        }
      };
    }

    if (!this.services.has(request.topic)) {
      namida.logFailure(
        'ServiceManager',
        'no service for topic "' + request.topic + '" registered! request:\n' + JSON.stringify(request)
      );

      return {
        error: {
          title: 'Service request error',
          message: 'unknown topic: ' + request.topic,
          stack: JSON.stringify(request)
        }
      };
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
