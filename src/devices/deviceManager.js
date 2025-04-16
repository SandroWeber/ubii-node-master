const EventEmitter = require('events');

const { LoggingService } = require('@tum-far/ubii-node-nodejs');

const Device = require('./device.js');
const { TopicMultiplexer } = require('./topicMultiplexer.js');
const { TopicDemultiplexer } = require('./topicDemultiplexer.js');
const FilterUtils = require('../utils/filterUtils.js');

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
    this.topicData = masterNode.getDependency(MASTER_NODE_CONSTANTS.TOPIC_DATA_BUFFER);
    this.clientManager = masterNode.getDependency(MASTER_NODE_CONSTANTS.MANAGERS.CLIENTS);
    this.notifyConditionsManager = masterNode.getDependency(MASTER_NODE_CONSTANTS.MANAGERS.NOTIFY_CONDITIONS);
  }

  hasDevice(id) {
    return this.devices.has(id);
  }

  getDevice(id) {
    this.devices.get(id);
  }

  getDevices(profile) {
    if (profile.id) {
      return [this.devices.get(id)];
    } else {
      const devices = this.getAllDevices();
      return FilterUtils.filterAll([profile], devices);
    }
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
   * Create a device object based on the provided specifications.
   * @param {ubii.devices.Device} specs The protobuf description of the device.
   * @returns The created device.
   */
  createDevice(specs) {
    let device = new Device(specs);

    for (let componentSpec of specs.components) {
      let component = this.getComponent({ topic: componentSpec.topic });
      if (!component) {
        component = this.registerComponentSpecs(componentSpec);
      }
      device.addComponent(component);
    }
    // add device to client specs
    if (device.clientId) {
      let client = this.clientManager.getClient(device.clientId);
      if (client) {
        client.devices.push(device);
      } else {
        logger.error({
          label: DeviceManager.LOG_TAG,
          message: `client with ID ${device.clientId} does not exist, can not create device.`
        });
      }
    }

    this.devices.set(device.id, device);

    return device;
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
   * @param {Object} specs
   * @returns On success returns the specifications of the created device.
   */
  registerDeviceSpecs(specs) {
    let deviceID = specs.id;
    if (deviceID && this.hasDevice(deviceID)) {
      const msg = 'The Device with ID ' + deviceID + ' is already registered';
      logger.error({
        label: DeviceManager.LOG_TAG,
        message: msg
      });

      throw new Error(msg);
    }

    if (!specs.clientId || !this.clientManager.hasClient(specs.clientId)) {
      const msg = `Trying to register device without clientId or existing client: clientId = ${
        specs.clientId
      }, client existing =  ${this.clientManager.hasClient(specs.clientId)}`;
      logger.error({
        label: DeviceManager.LOG_TAG,
        message: msg
      });

      throw new Error(msg);
    }

    let device = this.createDevice(specs);

    logger.info({
      label: DeviceManager.LOG_TAG,
      message: 'New Device "' + device.toString() + '" registered'
    });

    let deviceSpecs = device.toProtobuf();
    this.emit(DeviceManager.EVENTS.NEW_DEVICE, deviceSpecs);

    return deviceSpecs;
  }

  getComponent({ id, topic }) {
    if (topic) {
      return this.mapTopic2Component.get(topic);
    } else if (id) {
      return this.getAllComponents().find((component) => component.id === id);
    }
  }

  getComponents(profile) {
    let components = [];
    if (profile.topic) {
      components.push(this.mapTopic2Component.get(profile.topic));
    } else {
      const components = this.getAllComponents();
      components.push(...FilterUtils.filterAll([profile], components));
    }

    return components;
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
