const { ProcessingModule, ProcessingModuleManager } = require('@tum-far/ubii-node-nodejs/src/index');

const { MasterNode } = require('./node/masterNode');

const { Client } = require('./clients/client');
const { ClientManager } = require('./clients/clientManager');

const { DeviceManager } = require('./devices/deviceManager');
const { Watcher } = require('./devices/watcher');
const { Participant } = require('./devices/participant');
const { TopicMultiplexer } = require('./devices/topicMultiplexer');
const { TopicDemultiplexer } = require('./devices/topicDemultiplexer');

const { Session } = require('./sessions/session');
const { SessionManager } = require('./sessions/sessionManager');

const { ServiceManager } = require('./services/serviceManager');
const { ClientRegistrationService } = require('./services/clients/clientRegistrationService');
const { DeviceRegistrationService } = require('./services/devices/deviceRegistrationService');
const { SubscriptionService } = require('./services/subscriptionService');

module.exports = {
  MasterNode,
  Client,
  ClientManager,
  DeviceManager,
  Watcher,
  Participant,
  TopicMultiplexer,
  TopicDemultiplexer,
  Session,
  SessionManager,
  ProcessingModule,
  ProcessingModuleManager,
  ServiceManager,
  ClientRegistrationService,
  DeviceRegistrationService,
  SubscriptionService
};
