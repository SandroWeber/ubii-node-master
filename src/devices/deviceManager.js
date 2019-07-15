const namida = require('@tum-far/namida');

const { proto } = require('@tum-far/ubii-msg-formats');
const { Participant } = require('./../devices/participant.js');
const { Watcher } = require('./../devices/watcher.js');
const { TopicMultiplexer } = require('./../devices/topicMultiplexer.js');
const { TopicDemultiplexer } = require('./../devices/topicDemultiplexer.js');

const REJECT_REGISTRATION_FEEDBBACK_TITLE = 'Device registration rejected';
const ACCEPT_REGISTRATION_FEEDBACK_TITLE = 'Device registration accepted';

/**
 * The DeviceManager manages Device objects. It is part of a server node.
 * The server node uses it to manages all entities that interact with the functionalities of the server.
 */
class DeviceManager {
  constructor(clientManager, topicData, server) {
    this.clientManager = clientManager;
    this.topicData = topicData;
    this.server = server;
    this.participants = new Map();
    this.watchers = new Map();
    this.topicMuxers = new Map();
    this.topicDemuxers = new Map();

    namida.log('Device Manager Ready', 'The Device Manager is initialized and ready to work.');
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
      this.getParticipant(id).components.forEach(component => {
        this.topicData.remove(component.topic)
      });
      this.removeParticipant(id);
    } else if (this.hasWatcher(id)) {
      this.removeWatcher(id);
    }
  }

  removeClientDevices(clientID) {
    this.participants.forEach(participant => {
      if (participant.clientId === clientID) {
        this.removeParticipant(participant.id);
      }
    });
    this.watchers.forEach(watcher => {
      if (watcher.clientId === clientID) {
        this.removeWatcher(watcher.id);
      }
    });
  }

  // Participants utilities:

  /**
   * Get the participant with the specified identifier.
   * @param {String} deviceIdentifier Universally unique identifier of a Device.
   * @returns Device object with the specified identifier.
   */
  getParticipant(deviceIdentifier) {
    return this.participants.get(deviceIdentifier);
  }

  /**
   * Is there a participant with the specified identifier in the participants map?
   * @param {String} deviceIdentifier Universally unique identifier of a Device.
   * @returns Boolean indicating if there is a participant with the specified identifier.
   */
  hasParticipant(deviceIdentifier) {
    return this.participants.has(deviceIdentifier);
  }

  /**
   * Add the specified participant to the participants map.
   * @param {Object} participant
   */
  addParticipant(participant) {
    this.participants.set(participant.id, participant);
  }

  /**
   * Remove the participant with the specified identiier from the participants map.
   * @param {String} deviceIdentifier Universally unique identifier of a Device.
   */
  removeParticipant(deviceIdentifier) {
    this.getParticipant(deviceIdentifier).deactivate();
    this.participants.delete(deviceIdentifier);
    console.info('removeParticipant - ' + deviceIdentifier);
  }

  /**
   * Register the passed device as participant and initializes the behavior of the participant.
   * @param {Object} device
   */
  registerParticipant(device) {
    // Register the participant.
    this.addParticipant(device);
  }

  /**
   * Verify the specified participant.
   * @param {String} deviceIdentifier Universally unique identifier of a Device.
   * @returns Returns true if the specified client is a verfied client, returns false otherwise.
   */
  verifyParticipant(deviceIdentifier) {
    if (!this.hasParticipant(deviceIdentifier)) {
      return false;
    } else {
      return true;
    }
  }

  // Watchers utilities:

  /**
   * Get the watcher with the specified identifier.
   * @param {String} deviceIdentifier Universally unique identifier of a Device.
   * @returns Watcher object with the specified identifier.
   */
  getWatcher(deviceIdentifier) {
    return this.watchers.get(deviceIdentifier);
  }

  /**
   * Is there a watcher with the specified identifier in the watchers map?
   * @param {String} deviceIdentifier Universally unique identifier of a Device.
   * @returns Boolean indicating if there is a watcher with the specified identifier.
   */
  hasWatcher(deviceIdentifier) {
    return this.watchers.has(deviceIdentifier);
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
    console.info('removeWatcher - ' + deviceIdentifier);
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

  // General:

  /**
   * Creates and returns a new Universally Unique Identifier (UUID).
   * @returns {String} The newly created Universally Unique Identifier (UUID).
   */
  /*createDeviceUuid() {
    return uuidv4();
  }*/

  /**
   * Create a new device specification with the passed parameters and a new Universally Unique Identifier (UUID) as identifier.
   * @param {String} name
   * @param {String} namespace
   * @param {*} deviceType The type of the device. See the ubii-msg-formats repository for more information.
   * @param {String} correspondingClientIdentifier Universally unique identifier of the corresponding Client.
   */
  /*createDeviceSpecificationWithNewUuid(name, namespace, deviceType, correspondingClientIdentifier) {
    return {
      id: this.createDeviceUuid(),
      name: name,
      namespace: namespace,
      deviceType: deviceType,
      clientId: correspondingClientIdentifier
    };
  }*/

  // Message and request process methods:

  /**
   * Process the registration of the specified device at the device manager.
   * @param {Object} deviceSpecification
   * @param {*} context
   * @returns Returns the payload of the process result. This can be the device specification or an error.
   */
  processDeviceRegistration(deviceSpecification, context) {
    // Prepare some variables.
    let deviceID = deviceSpecification.id;
    let clientID = deviceSpecification.clientId;

    // Check the context.
    if (context.feedback === undefined) {
      context.feedback = {};
    }

    // Check if the device is already registered as participant...
    if (deviceID && this.hasParticipant(deviceID)) {
      // ... if so, check the state of the registered client if reregistering is possible.
      if (this.clientManager.getClient(clientID).registrationDate < this.getParticipant(deviceID).lastSignOfLife
        || deviceSpecification.deviceType !== 'PARTICIPANT') {
        // -> REregistering is not an option: Reject the registration.

        // Update the context feedback.
        context.feedback.message = `The Device with id ${namida.style.messageHighlight(deviceID)} ` +
          'is already registered as participant.';
        context.feedback.title = REJECT_REGISTRATION_FEEDBBACK_TITLE;
        context.success = false;

        // Ouput the feedback on the server console.
        namida.logFailure(context.feedback.title, context.feedback.message);

        return undefined;
      } else {
        // -> REregistering is possible: Prepare the registration.

        // Update the context feedback.
        context.feedback.message = `Reregistration of Participant with id ${namida.style.messageHighlight(deviceID)} ` +
          'initialized because it is already registered but the corresponding client was reregistered since ' +
          'the last sign of life of this device.';
        context.feedback.title = ACCEPT_REGISTRATION_FEEDBACK_TITLE;

        // Ouput the feedback on the server console.
        namida.logWarn(context.feedback.title, context.feedback.message);

        // Prepare the reregistration.
        this.removeParticipant(deviceID);

        // Update the feedback.
        context.feedback.message = `Participant with id ${namida.style.messageHighlight(deviceID)} reregistered.`;
        context.feedback.title = ACCEPT_REGISTRATION_FEEDBACK_TITLE;

        // Continue with the normal registration process...
      }
    }

    // ... or watcher.
    if (deviceID && this.hasWatcher(deviceID)) {
      // ... if so, check the state of the registered client if reregistering is possible.
      if (this.clientManager.getClient(clientID).registrationDate < this.getWatcher(deviceID).lastSignOfLife
        || deviceSpecification.deviceType !== 'WATCHER') {
        // -> REregistering is not an option: Reject the registration.

        // Update the context feedback.
        context.feedback.message = `The Device with id ${namida.style.messageHighlight(deviceID)} ` +
          'is already registered as watcher.';
        context.feedback.title = REJECT_REGISTRATION_FEEDBBACK_TITLE;
        context.success = false;

        // Ouput the feedback on the server console.
        namida.logFailure(context.feedback.title, context.feedback.message);

        return undefined;
      } else {
        // -> REregistering is possible: Prepare the registration.

        // Update the context feedback.
        context.feedback.message = `Reregistration of Watcher with id ${namida.style.messageHighlight(deviceID)} ` +
          'initialized because it is already registered but the corresponding client was reregistered since ' +
          'the last sign of life of this device.';
        context.feedback.title = ACCEPT_REGISTRATION_FEEDBACK_TITLE;
        context.success = true;

        // Ouput the feedback on the server console.
        namida.logWarn(context.feedback.title, context.feedback.message);

        // Prepare the reregistration.
        this.removeParticipant(deviceID);

        // Continue with the normal registration process...
      }
    }

    let currentDevice = {};
    // Handle the registration of a participant.
    if (deviceSpecification.deviceType === proto.ubii.devices.Device.DeviceType.PARTICIPANT) {
      currentDevice = new Participant(deviceSpecification,
        this.clientManager.getClient(clientID),
        this.topicData);
      this.registerParticipant(currentDevice);
    }

    // Handle the registration of a watcher.
    if (deviceSpecification.deviceType === proto.ubii.devices.Device.DeviceType.WATCHER) {
      currentDevice = new Watcher(deviceSpecification,
        this.clientManager.getClient(clientID),
        this.topicData);
      this.registerWatcher(currentDevice);
    }

    // Update the feedback to the default registartion feedback.
    context.feedback.message = `New Device with id ${namida.style.messageHighlight(currentDevice.id)} registered.`;
    context.feedback.title = ACCEPT_REGISTRATION_FEEDBACK_TITLE;
    context.success = true;

    // Ouput the feedback on the server console.
    namida.logSuccess(context.feedback.title, context.feedback.message);

    // Update the device information.
    currentDevice.updateInformation();

    // Return the deviceSpecification payload.
    return currentDevice;
  }

  addTopicMux(specs) {
    if (this.topicMuxers.has(specs.id)) {
      throw 'TopicMux with ID ' + specs.id + ' already exists.';
    }

    let mux = new TopicMultiplexer(specs, this.topicData);
    this.topicMuxers.set(mux.id, mux);

    return mux;
  }

  deleteTopicMux(id) {
    this.topicMuxers.delete(id);
  }

  hasTopicMux(id) {
    return this.topicMuxers.some((mux) => { return mux.id === id; });
  }

  getTopicMux(id) {
    return this.topicMuxers.find((mux) => { return mux.id === id; });
  }

  getTopicMuxList() {
    return Array.from(this.topicMuxers.values());
  }

  addTopicDemux(specs) {
    if (this.topicDemuxers.has(specs.id)) {
      throw 'TopicMux with ID ' + specs.id + ' already exists.';
    }

    let demux = new TopicDemultiplexer(specs, this.topicData);
    this.topicDemuxers.set(demux.id, demux);

    return demux;
  }

  deleteTopicDemux(id) {
    this.topicDemuxers.delete(id);
  }

  hasTopicDemux(id) {
    return this.topicDemuxers.some((demux) => { return demux.id === id; });
  }

  getTopicDemux(id) {
    return this.topicDemuxers.find((demux) => { return demux.id === id; });
  }

  getTopicDemuxList() {
    return Array.from(this.topicDemuxers.values());
  }
}

module.exports = {
  'DeviceManager': DeviceManager,
};