const EventEmitter = require('events');

const { proto, MSG_TYPES, DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');
const { LoggingService } = require('@tum-far/ubii-node-nodejs');

const Device = require('./device.js');
const { TopicMultiplexer } = require('./topicMultiplexer.js');
const { TopicMultiplexer } = require('./topicMultiplexer.js');
const { TopicDemultiplexer } = require('./topicDemultiplexer.js');
const FilterUtils = require('../utils/filterUtils.js');
const Utils = require('../utils/utilities');

const MASTER_NODE_CONSTANTS = require('../node/constants');
const Component = require('./component.js');

const logger = LoggingService.instance.logger;

/**
 * The DeviceManager manages Device objects. It is part of a server node.
 * The server node uses it to manages all entities that interact with the functionalities of the server.
 */
class DeviceManager extends EventEmitter {
  static LOG_TAG = '[UBII DeviceManager]';

  constructor() {
    super();

    this.devices = new Map();
    this.topicMuxers = new Map();
    this.topicDemuxers = new Map();
    this.mapTopic2Component = new Map();
  }

  setDependencies(masterNode) {
    this.masterNode = masterNode;
    this.topicData = this.masterNode.getDependency(MASTER_NODE_CONSTANTS.TOPIC_DATA_BUFFER);
    this.clientManager = this.masterNode.getDependency(MASTER_NODE_CONSTANTS.MANAGERS.CLIENTS);
    this.notifyConditionsManager = this.masterNode.getDependency(MASTER_NODE_CONSTANTS.MANAGERS.NOTIFY_CONDITIONS);
  }

  hasDevice(id) {
    return this.devices.has(id);
  }

  getDevice(id) {
    return this.devices.get(id);
  }

  getAllDevices() {
    return Array.from(this.devices.values());
  }

  getDevicesByClientId(clientId) {
    let devices = [];
    for (const [deviceID, device] of this.devices) {
      if (device.clientId === clientId) {
        devices.push(device);
      }
    }

    return devices;
  }

  /**
   * Add the specified device.
   * @param {Object} device
   */
  addDevice(device) {
    this.devices.set(device.id, device);
    // add device to client specs
    let client = this.clientManager.getClient(device.clientId);
    if (client) {
      client.devices.push(device);
    }
  }

  removeDevice(id) {
    if (this.hasDevice(id)) {
      this.getDevice(id).components.forEach((component) => {
        this.topicData.remove(component.topic);
      });
      this.removeDevice(id);
    }
  }

  removeClientDevices(clientID) {
    for (const device of this.devices) {
      if (device.clientId === clientID) {
        this.removeDevice(device.id);
      }
    }
  }

  /**
   * Process the registration of the specified device at the device manager.
   * @param {Object} registeringSpec
   * @returns Returns the payload of the process result. This can be the device specification or an error.
   */
  registerDeviceSpecs(registeringSpec) {
    // Prepare some variables.
    let deviceID = registeringSpec.id;
    let clientID = registeringSpec.clientId;

    // Check if the device is already registered as participant...
    if (deviceID && this.hasDevice(deviceID)) {
      // ... if so, check the state of the registered client if reregistering is possible.
      if (this.clientManager.getClient(clientID).registrationDate < this.getDevice(deviceID).lastSignOfLife) {
        // -> REregistering is not an option: Reject the registration.
        logger.error({
          label: DeviceManager.LOG_TAG,
          message: 'The Device with ID ' + deviceID + ' is already registered'
        });

        throw new Error(msg);
      } else {
        // -> REregistering is possible: Prepare the registration.
        logger.warn({
          label: DeviceManager.LOG_TAG,
          message:
            `Reregistration of device with ID ${deviceID} initialized because it is already registered but the corresponding client was reregistered since the last sign of life of this device.`
        });

        // Prepare the reregistration.
        this.removeDevice(deviceID);

        // Continue with the normal registration process...
      }
    }

    let newDevice = new Device(registeringSpec, this.clientManager.getClient(clientID));
    this.addDevice(newDevice);

    for (let componentSpec of registeringSpec.components) {
      let component = this.getComponent({ topic: componentSpec.topic });
      if (!component) {
        component = this.registerComponentSpecs(componentSpec);
      }
      newDevice.addComponent(component);
    }

    logger.info({
      label: DeviceManager.LOG_TAG,
      message: 'New Device "' + newDevice.toString() + '" registered'
    });

    let deviceSpecs = newDevice.toProtobuf();
    this.emit(DeviceManager.EVENTS.NEW_DEVICE, deviceSpecs);
    this.masterNode.publishRecord(
      {
        topic: DEFAULT_TOPICS.INFO_TOPICS.NEW_DEVICE,
        type: Utils.getTopicDataTypeFromMessageFormat(MSG_TYPES.DEVICE),
        device: deviceSpecs
      },
      this.masterNode.id
    );

    // Return the deviceSpecification payload.
    return newDevice;
  }

  getComponent(profile) {
    if (profile.topic) {
      return this.mapTopic2Component.get(profile.topic);
    } else if (profile.id) {
      return this.getAllComponents().find((component) => component.id === profile.id);
    } else {
      const components = this.getAllComponents();
      return FilterUtils.filterAll([profile], components);
    }
  }

  getAllComponents() {
    return [...this.mapTopic2Component.values()];
  }

  registerComponentSpecs(specs) {
    let component = this.getComponent({ topic: specs.topic });
    if (component) {
      logger.warn(
        this.LOG_TAG + ' registerComponentSpecs() - component with topic "' + specs.topic + '" already exists'
      );
      return undefined;
    }
    component = this.getComponent({ id: specs.id });
    if (component) {
      logger.warn(this.LOG_TAG + ' registerComponentSpecs() - component with ID "' + specs.id + '" already exists');
      return undefined;
    }

    component = new Component(specs, this.notifyConditionsManager);
    this.mapTopic2Component.set(component.topic, component);

    return component;
  }

  createTopicMuxerBySpecs(specs, topicDataBuffer = this.topicData) {
    if (this.topicMuxers.has(specs.id)) {
      throw 'TopicMux with ID ' + specs.id + ' already exists.';
    }

    let mux = new TopicMultiplexer(specs, topicDataBuffer);
    this.topicMuxers.set(mux.id, mux);

    return mux;
  }

  deleteTopicMux(id) {
    this.topicMuxers.delete(id);
  }

  hasTopicMux(id) {
    return (
      this.topicMuxers &&
      this.topicMuxers.some((mux) => {
        return mux.id === id;
      })
    );
  }

  getTopicMux(id) {
    return (
      this.topicMuxers &&
      this.topicMuxers.find((mux) => {
        return mux.id === id;
      })
    );
  }

  getTopicMuxList() {
    return Array.from(this.topicMuxers.values());
  }

  createTopicDemuxerBySpecs(specs, topicDataBuffer = this.topicData) {
    if (this.topicDemuxers.has(specs.id)) {
      throw 'TopicMux with ID ' + specs.id + ' already exists.';
    }

    let demux = new TopicDemultiplexer(specs, topicDataBuffer);
    this.topicDemuxers.set(demux.id, demux);

    return demux;
  }

  deleteTopicDemux(id) {
    this.topicDemuxers.delete(id);
  }

  hasTopicDemux(id) {
    return this.topicDemuxers.some((demux) => {
      return demux.id === id;
    });
  }

  getTopicDemux(id) {
    return this.topicDemuxers.find((demux) => {
      return demux.id === id;
    });
  }

  getTopicDemuxList() {
    return Array.from(this.topicDemuxers.values());
  }
}

DeviceManager.EVENTS = Object.freeze({
  NEW_DEVICE: 'NEW_DEVICE'
});

module.exports = DeviceManager;
