const {
  TIME_UNTIL_PING,
  TIME_UNTIL_STANDBY,
  TIME_UNTIL_INACTIVE,
  SIGN_OF_LIFE_DELTA_TIME
} = require('./constants');
const namida = require('@tum-far/namida');
const uuidv4 = require('uuid/v4');
const { TOPIC_EVENTS } = require('@tum-far/ubii-topic-data');

let clientStateEnum = Object.freeze({
  "active": "active",
  "standby": "standby",
  "inactive": "inactive"
});

const { ProtobufTranslator, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class Client {
  constructor({ id, name = '', devices = [], tags = [], description = '' }, server, topicData) {
    this.id = id ? id : uuidv4();
    this.name = name;
    this.devices = devices;
    this.tags = tags;
    this.description = description;

    this.server = server;
    this.topicData = topicData;

    this.state = clientStateEnum.active;
    this.registrationDate = new Date();
    this.lastSignOfLife = null;
    this.topicSubscriptionTokens = new Map();
    this.regexSubscriptionTokens = new Map();

    this.topicDataTranslator = new ProtobufTranslator(MSG_TYPES.TOPIC_DATA);
  }

  /**
   * Get the current state.
   */
  getState() {
    return this.state;
  }

  /**
   * Set the current state.
   */
  setState(state) {
    if (state === clientStateEnum.active) {
      this.startLifeMonitoring();
    } else if (state === clientStateEnum.inactive) {
      this.stopLifeMonitoring();
    }
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
  }

  /**
   * Start the life monitoring process with state tracking and remote pinging.
   */
  startLifeMonitoring() {
    this.updateLastSignOfLife();

    // Specify the ping behaviour.
    let signOfLifePingCallback = () => {
      try {
        this.updateLastSignOfLife();
      } catch (e) {
        namida.error('UpdateLastSignOfLife failed',
          `UpdateLastSignOfLife of client with id ${this.id} failed with an error.`,
          '' + (e.stack || e));
      }
    }

    // Ping the remote for the first time
    this.pingRemote(() => {
      signOfLifePingCallback();
    })

    // Start an interval for regular pings and state checks.
    this.signOfLifeInterval = setInterval(() => {
      // Determine the time since the last sign of life.
      let now = new Date();
      let difference = (now - this.lastSignOfLife);

      // Determine the current state. If the state changes, ouput the feedback on the server console.
      if (difference > TIME_UNTIL_STANDBY) {
        if (difference > TIME_UNTIL_INACTIVE) {
          // The client has the state inactive.
          if (this.state !== clientStateEnum.inactive) {
            namida.log(`Client State has changed`,
              `Client with id ${this.id} is not available and is now in an inactive state.`);
          }
          this.state = clientStateEnum.inactive;
        } else {
          // The client has the state standby.
          if (this.state !== clientStateEnum.standby) {
            namida.log(`Client State has changed`,
              `Client with id ${this.id} is not available and is now in an standby state.`);
          }
          this.state = clientStateEnum.standby;
        }
      } else {
        // The client has the state active.
        if (this.state !== clientStateEnum.active) {
          namida.log(`Client State has changed`,
            `Client with id ${this.id} is available again and is now in an active state.`);
        }
        this.state = clientStateEnum.active;
      }

      // Should we ping the remote?
      if (difference > TIME_UNTIL_PING) {
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
   * Subscribe to a topic at the topicData
   * @param {String} topic
   */
  subscribe(topic) {
    if (this.topicSubscriptionTokens.has(topic)) {
      namida.logFailure(`Topic Data subscription rejected`,
        `Client with id ${this.id} is already subscribed to this topic.`);
      return;
    }

    // subscribe
    let token = this.topicData.subscribe(topic, (topic, entry) => {
      let payload = {
        topicDataRecord: {
          topic: topic
        }
      };
      payload.topicDataRecord[entry.type] = entry.data;

      try {
        let buffer = this.topicDataTranslator.createBufferFromPayload(payload);
        this.sendMessageToRemote(buffer);
      } catch (error) {
        console.error(error);
      }
    });

    // save token
    this.topicSubscriptionTokens.set(topic, token);
  }

  /**
   * Unsubscribes from a topic at the topicData.
   * @param {String} topic
   */
  unsubscribe(topic) {
    if (!this.topicSubscriptionTokens.has(topic)) {
      namida.logFailure(`Topic Data unsubscription rejected`,
        `Client with ID ${this.id} is not subscribed to this topic.`);
      return;
    }

    // get token
    let token = this.topicSubscriptionTokens.get(topic);

    // unsubscribe
    this.topicData.unsubscribe(token);
    // remove token
    this.topicSubscriptionTokens.delete(topic);
  }

  /**
   * Subscribe to a regex at topicData
   * @param {String} regexString
   */
  subscribeRegex(regexString) {
    if (this.regexSubscriptionTokens.has(regexString)) {
      namida.logFailure(`RegExp subscription rejected`,
        `Client with id ${this.id} is already subscribed to this RegExp.`);
      return false;
    }

    // subscribe
    let regex = new RegExp(regexString);

    let subscriptionCallback = (topic) => {
      if (regex.test(topic)) {
        this.subscribe(topic);
      }
    };

    // auto-subscribe on new matching topics
    this.topicData.events.addListener(TOPIC_EVENTS.NEW_TOPIC, subscriptionCallback);

    this.topicData.getAllTopicsWithData().map(entry => entry.topic).forEach(subscriptionCallback);

    let token = {
      'regexString': regexString,
      'regex': regex,
      'id': this.id,
      'type': 'single',
      'subscriptionCallback': subscriptionCallback
    };

    // save token
    this.regexSubscriptionTokens.set(regexString, token);

    return true;
  }

  /**
   * Unsubscribe from a regex at topicData
   * @param {String} regexString
   */
  unsubscribeRegex(regexString) {
    if (!this.regexSubscriptionTokens.has(regexString)) {
      namida.logFailure(`RegExp unsubscription rejected`,
        `Client with ID ${this.id} is not subscribed to this RegExp.`);
      return;
    }

    // get token
    let regexToken = this.regexSubscriptionTokens.get(regexString);

    // remove subscriptionCallback
    this.topicData.events.removeListener(TOPIC_EVENTS.NEW_TOPIC, regexToken.subscriptionCallback);

    // unsubscribe
    let topicList = [];
    this.topicSubscriptionTokens.forEach((token) => {
      if (regexToken.regex.test(token.topic)) {
        topicList.push(token.topic);
      }
    });
    topicList.forEach(topic => {
      this.unsubscribe(topic);
    });
    // remove token
    this.regexSubscriptionTokens.delete(regexString);
  }

  unsubscribeAll() {
    for (let token in this.topicSubscriptionTokens) {
      this.topicData.unsubscribe(token);
    }
  }

  toProtobuf() {
    return {
      id: this.id,
      name: this.name,
      devices: this.devices,
      tags: this.tags,
      description: this.description
    }
  }
}

module.exports = {
  'Client': Client,
  'clientStateEnum': clientStateEnum,
};