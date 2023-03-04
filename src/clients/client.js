const {
  TIME_UNTIL_PING,
  TIME_UNTIL_INACTIVE,
  TIME_UNTIL_UNAVAILABLE,
  SIGN_OF_LIFE_DELTA_TIME
} = require('./constants');
const namida = require('@tum-far/namida');
const { v4: uuidv4 } = require('uuid');
const { ProtobufTranslator, MSG_TYPES, proto } = require('@tum-far/ubii-msg-formats');
const latency = require('../network/latency');
const { DeviceManager } = require('../devices/deviceManager');
const FilterUtils = require('../utils/filterUtils');

class Client {
  constructor(specs = {}, server, topicData, clientManager) {
    // take over specs
    specs && Object.assign(this, specs);
    // new instance is getting new ID
    this.id = uuidv4();
    this.devices = this.devices ? this.devices : [];
    this.processingModules = this.processingModules ? this.processingModules : [];

    this.server = server;
    this.topicData = topicData;
    this.clientManager = clientManager;

    this.state = proto.ubii.clients.Client.State.ACTIVE;
    this.registrationDate = new Date();
    this.lastSignOfLife = null;
    this.topicSubscriptions = new Map();
    this.regexSubscriptions = new Map();
    this.componentSubscriptions = new Map();

    this.topicDataTranslator = new ProtobufTranslator(MSG_TYPES.TOPIC_DATA);
    this.publishedTopics = [];
    this.latency = 0;

    DeviceManager.instance.on(DeviceManager.EVENTS.NEW_DEVICE, (deviceSpecs) => {
      this.onNewDevice(deviceSpecs);
    });
  }

  /**
   * Set the current state.
   */
  setState(state) {
    if (state === proto.ubii.clients.Client.State.ACTIVE) {
      this.startLifeMonitoring();
    } else if (state === proto.ubii.clients.Client.State.INACTIVE) {
      this.stopLifeMonitoring();
    }
  }

  /**
   * Update the latency of the client.
   */
  updateLatency(latencyInMs) {
    this.latency = latencyInMs;
  }

  /**
   * Update the lastSignOfLife vairable with the current date.
   */
  updateLastSignOfLife() {
    this.lastSignOfLife = new Date();
  }

  /**
   * Update relevant information of this client.
   */
  updateInformation() {
    this.updateLastSignOfLife();
  }

  /**
   * Send a message to the remote.
   * @param {*} message
   */
  sendMessageToRemote(message) {
    this.server.send(this.id, message);
  }

  /**
   * Ping the remote.
   * @param {Function} onPongCallback Function called when the pong message is received.
   */
  pingRemote(onPongCallback) {
    this.server.ping(this.id, onPongCallback);
  }

  /**
   * Deactivate the client. This function takes care of all pending tasks to correctly remove an object.
   * (For example, all intervals are cleared).
   * Note: You should call this method before clearing all references to a Client object.
   */
  deactivate() {
    this.stopLifeMonitoring();
    this.unsubscribeAll();
    this.deletePublishedTopics();
    //this.removeTopicsOfRegisteredComponents();
    namida.warn(this.toString(), 'deactivated due to missing sign of life, state=' + this.state);
  }

  /**
   * Start the life monitoring process with state tracking and remote pinging.
   */
  startLifeMonitoring() {
    this.updateLastSignOfLife();

    // Specify the ping behaviour.
    let signOfLifePingCallback = () => {
      try {
        latency.addLatency(this);
        this.updateLastSignOfLife();
      } catch (e) {
        namida.error(
          'UpdateLastSignOfLife failed',
          `UpdateLastSignOfLife of client with ID ${this.id} failed with an error.`,
          '' + (e.stack || e)
        );
      }
    };

    // Ping the remote for the first time
    this.pingRemote(() => {
      signOfLifePingCallback();
    });

    // Start an interval for regular pings and state checks.
    this.signOfLifeInterval = setInterval(() => {
      // Determine the time since the last sign of life.
      let now = new Date();
      let difference = now - this.lastSignOfLife;
      // Determine the current state. If the state changes, ouput the feedback on the server console.
      if (difference > TIME_UNTIL_UNAVAILABLE) {
        // The client has probably disconnected unexpectedly and should be removed.
        if (this.state !== proto.ubii.clients.Client.State.UNAVAILABLE) {
          namida.log(
            `Client State has changed`,
            `Client with ID ${this.id} is not available and is now in state "unavailable".`
          );
        }
        this.state = proto.ubii.clients.Client.State.UNAVAILABLE;
        this.deactivate();
      } else if (difference > TIME_UNTIL_INACTIVE) {
        // The client has the state inactive.
        /*if (this.state !== proto.ubii.clients.Client.State.INACTIVE) {
          namida.log(
            `Client State has changed`,
            `Client with id ${this.id} is not available and is now in an inactive state.`
          );
        }*/
        this.state = proto.ubii.clients.Client.State.INACTIVE;
      } else {
        // The client has the state active.
        /*if (this.state !== proto.ubii.clients.Client.State.ACTIVE) {
          namida.log(
            `Client State has changed`,
            `Client with id ${this.id} is available again and is now in an active state.`
          );
        }*/
        this.state = proto.ubii.clients.Client.State.ACTIVE;
      }

      // Should we ping the remote?
      if (difference > TIME_UNTIL_PING) {
        latency.addPing(this.id);
        this.pingRemote(() => {
          signOfLifePingCallback();
        });
      }
    }, SIGN_OF_LIFE_DELTA_TIME);
  }

  stopLifeMonitoring() {
    if (this.signOfLifeInterval !== undefined) {
      clearInterval(this.signOfLifeInterval);
    }
  }

  /**
   * Internally subscribe to a topic at the topicData
   * @param {String} topic
   */
  subscribeAtTopicData(topic) {
    if (this.topicSubscriptions.has(topic)) {
      return false;
    }

    // subscribe
    let token = this.topicData.subscribeTopic(topic, (record, publisherId) =>
      this.subscriptionCallback(record, publisherId)
    );
    this.topicSubscriptions.set(topic, token);

    // check if topic already has data, if so send it to remote
    let record = this.topicData.pull(topic);
    if (record) {
      this.subscriptionCallback(record);
    }

    return true;
  }

  subscriptionCallback(record, publisherId) {
    let component = DeviceManager.instance.getComponentByTopic(record.topic);
    if (component && component.hasNotifyConditions()) {
      const clientProfilePub = this.clientManager.getClient(publisherId).toProtobuf();
      const clientProfileSub = this.toProtobuf();

      if (!component.checkNotifyConditions(clientProfilePub, clientProfileSub)) {
        return;
      }
    }

    //TODO: define tolerable delay between received and subscription callback, integrate with profiler
    if (record.tReceived) {
      let delay = Date.now() - record.tReceived;
      if (delay > 10) {
        namida.warn(this.toString(), 'sub callback delay >10ms');
      }
    }

    let payload = {
      topicDataRecord: record
    };

    try {
      let buffer = this.topicDataTranslator.createBufferFromPayload(payload);
      this.sendMessageToRemote(buffer);
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Internally unsubscribes from a topic at the topicData.
   * @param {String} topic
   */
  unsubscribeAtTopicData(topic) {
    if (!this.topicSubscriptions.has(topic)) {
      return false;
    }

    let token = this.topicSubscriptions.get(topic);
    this.topicData.unsubscribe(token);
    this.topicSubscriptions.delete(topic);

    return true;
  }

  /**
   * Subscribe to a topic, to be called from outside when subscribing to a single topic
   * @param {String} topic
   */
  subscribeTopic(topic) {
    let token = this.topicSubscriptions.get(topic);
    if (token) {
      namida.warn(this.toString(), `subscription skipped, already subscribed to topic ${topic}.`);
      return;
    }

    if (!token) {
      let success = this.subscribeAtTopicData(topic);
      // successfully subscribed just now or already subscribed by some other means
      if (!success) {
        namida.logFailure(this.toString(), 'failed to subscribe to ' + topic + ' at topic data buffer');
      }
    }
  }

  /**
   * Unsubscribe from a topic, to be called from outside when unsubscribing from a single topic
   * @param {String} topic
   */
  unsubscribeTopic(topic) {
    // no (explicit) subscription?
    if (!this.topicSubscriptions.has(topic)) {
      namida.warn(this.toString(), `not subscribed to topic ${topic}.`);
      return;
    }
    this.unsubscribeAtTopicData(topic);
  }

  /**
   * Subscribe to a regular expression
   * @param {String} regexString
   */
  subscribeRegex(regexString) {
    if (this.regexSubscriptions.has(regexString)) {
      namida.logFailure(this.toString(), `already subscribed to regex "${regexString}"`);
      return false;
    }

    let token = this.topicData.subscribeRegex(regexString, (record) => this.subscriptionCallback(record));
    this.regexSubscriptions.set(regexString, token);

    return true;
  }

  /**
   * Unsubscribe from a regular expression
   * @param {String} regexString
   */
  unsubscribeRegex(regexString) {
    if (!this.regexSubscriptions.has(regexString)) {
      namida.warn(this.toString(), `not subscribed to regex "${regexString}"`);
      return;
    }

    let token = this.regexSubscriptions.get(regexString);
    this.topicData.unsubscribe(token);
    this.regexSubscriptions.delete(regexString);
  }

  unsubscribeAll() {
    for (let token in this.topicSubscriptions) {
      this.topicData.unsubscribe(token);
    }
    for (let token in this.regexSubscriptions) {
      this.topicData.unsubscribe(token);
    }
    this.topicSubscriptions.clear();
    this.regexSubscriptions.clear();
  }

  deletePublishedTopics() {
    this.publishedTopics.forEach((topic) => {
      this.topicData.remove(topic);
    });
  }

  getComponentSubscription(componentProfile) {
    for (let key of this.componentSubscriptions.keys()) {
      if (FilterUtils.deepEqual(key, componentProfile)) {
        return this.componentSubscriptions.get(key);
      }
    }
  }

  getMatchingComponentSubscriptions(componentProfile) {
    let subs = [];
    for (let key of this.componentSubscriptions.keys()) {
      if (FilterUtils.matches(key, componentProfile)) {
        subs.push(this.componentSubscriptions.get(key));
      }
    }

    return subs;
  }

  addComponentSubscription(componentProfile) {
    if (this.getComponentSubscription(componentProfile)) return;

    let subscription = {
      tokens: []
    };
    this.componentSubscriptions.set(componentProfile, subscription);

    let matchingComponents = DeviceManager.instance.getComponentsByProfile(componentProfile);
    for (let component of matchingComponents) {
      //console.info('client addComponentSubscription() - found matching component with topic ' + component.topic);
      console.info(`client ${this.id} subscribed to topic "${component.topic}`);
      let token = this.topicData.subscribeTopic(component.topic, (record, publisherId) =>
        this.subscriptionCallback(record, publisherId)
      );
      subscription.tokens.push(token);
    }
  }

  onNewDevice(deviceSpecs) {
    for (let newComponent of deviceSpecs.components) {
      console.info('client onNewDevice() - checking component ' + newComponent.id);
      let subscriptions = this.getMatchingComponentSubscriptions(newComponent);
      console.info('client onNewDevice() - matching subs: ');
      console.info(subscriptions);
      for (let sub of subscriptions) {
        let token = this.topicData.subscribeTopic(newComponent.topic, (record, publisherId) =>
          this.subscriptionCallback(record, publisherId)
        );
        sub.tokens.push(token);
      }
    }
  }

  /*removeTopicsOfRegisteredComponents() {
    for (const device of DeviceManager.instance.getDevicesByClientId(this.id)) {
      for (const component of device.components) {
        this.topicData.remove(component.topic);
      }
    }
  }*/

  toProtobuf() {
    return {
      id: this.id,
      name: this.name,
      devices: this.devices,
      tags: this.tags,
      description: this.description,
      processingModules: this.processingModules,
      isDedicatedProcessingNode: this.isDedicatedProcessingNode,
      hostIp: this.hostIp,
      metadataJson: this.metadataJson,
      state: this.state,
      latency: this.latency
    };
  }

  toString() {
    return 'Client "' + this.name + '" (ID ' + this.id + ')';
  }
}

module.exports = {
  Client: Client
};
