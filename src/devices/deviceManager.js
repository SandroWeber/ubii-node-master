const namida = require('@tum-far/namida');
const { proto } = require('@tum-far/ubii-msg-formats');

const { Participant } = require('./../devices/participant.js');
const { Watcher } = require('./../devices/watcher.js');
const { TopicMultiplexer } = require('./../devices/topicMultiplexer.js');
const { TopicDemultiplexer } = require('./../devices/topicDemultiplexer.js');
const FilterUtils = require('../utils/filterUtils.js');

let _instance = null;
const SINGLETON_ENFORCER = Symbol();

/**
 * The DeviceManager manages Device objects. It is part of a server node.
 * The server node uses it to manages all entities that interact with the functionalities of the server.
 */
class DeviceManager {
  constructor(enforcer) {
    if (enforcer !== SINGLETON_ENFORCER) {
      throw new Error('Use ' + this.constructor.name + '.instance');
    }

    this.participants = new Map();
    this.watchers = new Map();
    this.topicMuxers = new Map();
    this.topicDemuxers = new Map();
  }

  static get instance() {
    if (_instance == null) {
      _instance = new DeviceManager(SINGLETON_ENFORCER);
    }

    return _instance;
  }

  setDependencies(topicDataBuffer, clientManager) {
    this.topicData = topicDataBuffer;
    this.clientManager = clientManager;
  }

  getDevice(id) {
    if (this.hasParticipant(id)) {
      return this.getParticipant(id);
    } else if (this.hasWatcher(id)) {
      return this.getWatcher(id);
    }
  }

  removeDevice(id) {
    if (this.hasParticipant(id)) {
      this.getParticipant(id).components.forEach((component) => {
        this.topicData.remove(component.topic);
      });
      this.removeParticipant(id);
    } else if (this.hasWatcher(id)) {
      this.removeWatcher(id);
    }
  }

  removeClientDevices(clientID) {
    this.participants.forEach((participant) => {
      if (participant.clientId === clientID) {
        this.removeDevice(participant.id);
      }
    });
    this.watchers.forEach((watcher) => {
      if (watcher.clientId === clientID) {
        this.removeDevice(watcher.id);
      }
    });
  }

  // Participants utilities:

  /**
   * Get the participant with the specified identifier.
   * @param {String} id Universally unique identifier of a Device.
   * @returns Device object with the specified identifier.
   */
  getParticipant(id) {
    return this.participants.get(id);
  }

  /**
   * Get a list of all participants.
   * @returns {array} The list of participants.
   */
  getAllParticipants() {
    return Array.from(this.participants.values());
  }

  /**
   * Is there a participant with the specified identifier in the participants map?
   * @param {String} id Universally unique identifier of a Device.
   * @returns Boolean indicating if there is a participant with the specified identifier.
   */
  hasParticipant(id) {
    return this.participants.has(id);
  }

  /**
   * Add the specified participant to the participants map.
   * @param {Object} device
   */
  addParticipant(device) {
    this.participants.set(device.id, device);
    // add device to client specs
    let client = this.clientManager.getClient(device.clientId);
    if (client) {
      client.devices.push(device.toProtobuf());
    }
  }

  /**
   * Remove the participant with the specified identiier from the participants map.
   * @param {String} id Universally unique identifier of a Device.
   */
  removeParticipant(id) {
    let participant = this.getParticipant(id);
    let client = this.clientManager.getClient(participant.clientId);
    if (client) {
      // remove device from client specs
      let index = client.devices.findIndex((device) => device.id === id);
      if (index > -1) {
        client.devices.splice(index, 1);
      }
    }
    // deactivate and remove participant
    participant.deactivate();
    this.participants.delete(id);
  }

  /**
   * Verify the specified participant.
   * @param {String} id Universally unique identifier of a Device.
   * @returns Returns true if the specified client is a verfied client, returns false otherwise.
   */
  verifyParticipant(id) {
    if (!this.hasParticipant(id)) {
      return false;
    } else {
      return true;
    }
  }

  // Watchers utilities:

  /**
   * Get the watcher with the specified identifier.
   * @param {String} id Universally unique identifier of a Device.
   * @returns Watcher object with the specified identifier.
   */
  getWatcher(id) {
    return this.watchers.get(id);
  }

  /**
   * Is there a watcher with the specified identifier in the watchers map?
   * @param {String} id Universally unique identifier of a Device.
   * @returns Boolean indicating if there is a watcher with the specified identifier.
   */
  hasWatcher(id) {
    return this.watchers.has(id);
  }

  /**
   * Add the specified watcher to the watchers map.
   * @param {Object} watcher
   */
  addWatcher(watcher) {
    this.watchers.set(watcher.id, watcher);
  }

  /**
   * Remove the watcher with the specified id from the watchers map.
   * @param {String} deviceIdentifier Universally unique identifier of a Device.
   */
  removeWatcher(deviceIdentifier) {
    this.getWatcher(deviceIdentifier).deactivate();
    this.watchers.delete(deviceIdentifier);
  }

  /**
   * Register the passed device as watcher and initializes the behavior of the watcher.
   * @param {Object} device
   */
  registerWatcher(device) {
    // Register the watcher.
    this.addWatcher(device);

    // Initially introduce all topics currently available in the topic data to new watchers.
    device.introduceTopicDataToRemote();

    // Subscribe the watcher to all current and future topics.
    // (because watchers should get notified about any changes in the topic data)
    device.subscribeAll();
  }

  /**
   * Verify the specified watcher.
   * @param {String} deviceIdentifier Universally unique identifier of a Device.
   * @returns Returns true if the specified device is a verfied watcher, returns false otherwise.
   */
  verifyWatcher(deviceIdentifier) {
    if (!this.hasWatcher(deviceIdentifier)) {
      return false;
    } else {
      return true;
    }
  }

  // Message and request process methods:

  /**
   * Process the registration of the specified device at the device manager.
   * @param {Object} deviceSpec
   * @returns Returns the payload of the process result. This can be the device specification or an error.
   */
  registerDeviceSpecs(deviceSpec) {
    // Prepare some variables.
    let deviceID = deviceSpec.id;
    let clientID = deviceSpec.clientId;

    // Check if the device is already registered as participant...
    if (deviceID && this.hasParticipant(deviceID)) {
      // ... if so, check the state of the registered client if reregistering is possible.
      if (
        this.clientManager.getClient(clientID).registrationDate < this.getParticipant(deviceID).lastSignOfLife ||
        deviceSpec.deviceType !== 'PARTICIPANT'
      ) {
        // -> REregistering is not an option: Reject the registration.
        let message = 'The Device with ID ' + deviceID + ' is already registered as participant';

        // Ouput the feedback on the server console.
        namida.logFailure('DeviceManager', message);

        throw new Error(message);
      } else {
        // -> REregistering is possible: Prepare the registration.
        let message =
          'Reregistration of Participant with ID ' +
          deviceID +
          ' initialized because it is already registered but the corresponding client was reregistered since ' +
          'the last sign of life of this device.';

        // Ouput the feedback on the server console.
        namida.logWarn('DeviceManager', message);

        // Prepare the reregistration.
        this.removeParticipant(deviceID);

        // Continue with the normal registration process...
      }
    }

    // ... or watcher.
    if (deviceID && this.hasWatcher(deviceID)) {
      // ... if so, check the state of the registered client if reregistering is possible.
      if (
        this.clientManager.getClient(clientID).registrationDate < this.getWatcher(deviceID).lastSignOfLife ||
        deviceSpec.deviceType !== 'WATCHER'
      ) {
        // -> REregistering is not an option: Reject the registration.
        let message = 'The Device with ID ' + deviceID + ' is already registered as watcher';

        // Ouput the feedback on the server console.
        namida.logFailure('DeviceManager', message);

        throw new Error(message);
      } else {
        // -> REregistering is possible: Prepare the registration.
        let message =
          'Reregistration of Watcher with ID ' +
          deviceID +
          ' initialized because it is already registered but the corresponding client was reregistered since ' +
          'the last sign of life of this device.';

        // Ouput the feedback on the server console.
        namida.logWarn('DeviceManager', message);

        // Prepare the reregistration.
        this.removeParticipant(deviceID);

        // Continue with the normal registration process...
      }
    }

    let currentDevice = {};
    // Handle the registration of a participant.
    if (deviceSpec.deviceType === proto.ubii.devices.Device.DeviceType.PARTICIPANT) {
      currentDevice = new Participant(deviceSpec, this.clientManager.getClient(clientID), this.topicData);
      this.addParticipant(currentDevice);
    }
    // Handle the registration of a watcher.
    else if (deviceSpec.deviceType === proto.ubii.devices.Device.DeviceType.WATCHER) {
      currentDevice = new Watcher(deviceSpec, this.clientManager.getClient(clientID), this.topicData);
      this.registerWatcher(currentDevice);
    } else {
      let message = 'device type not specified while trying to register';
      namida.logFailure('DeviceManager', message);
      throw new Error(message);
    }

    // Update the feedback to the default registartion feedback.
    let message = 'New Device with ID ' + currentDevice.id + ' registered';

    // Ouput the feedback on the server console.
    namida.logSuccess('DeviceManager', message);

    // Return the deviceSpecification payload.
    return currentDevice;
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

  getAllComponents() {
    let componentList = [];
    for (const [deviceID, device] of this.participants) {
      for (const component of device.components) {
        componentList.push(component);
      }
    }

    return componentList;
  }

  getComponentsByProfile(profile) {
    const components = this.getAllComponents();
    return FilterUtils.filterAll([profile], components);
  }

  getComponentByTopic(topic) {
    for (const [deviceID, device] of this.participants) {
      for (const component of device.components) {
        if (component.topic === topic) {
          return component;
        }
      }
    }
  }

  getDevicesByClientId(clientId) {
    let devices = [];
    for (const [deviceID, device] of this.participants) {
      if (device.clientId === clientId) {
        devices.push(device);
      }
    }

    return devices;
  }
}

module.exports = {
  DeviceManager: DeviceManager
};
