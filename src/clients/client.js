const {
  TIME_UNTIL_PING,
  TIME_UNTIL_STANDBY,
  TIME_UNTIL_INACTIVE,
  TIME_UNTIL_DISCONNECT,
  SIGN_OF_LIFE_DELTA_TIME
} = require('./constants');
const namida = require('@tum-far/namida');
const uuidv4 = require('uuid/v4');
const { TOPIC_EVENTS } = require('@tum-far/ubii-topic-data');

let CLIENT_STATE = Object.freeze({
  active: 'active',
  standby: 'standby',
  inactive: 'inactive',
  disconnected: 'disconnected'
});

const { ProtobufTranslator, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class Client {
  constructor(specs = {}, server, topicData) {
    // take over specs
    specs && Object.assign(this, JSON.parse(JSON.stringify(specs)));
    // new instance is getting new ID
    this.id = uuidv4();
    this.devices = this.devices ? this.devices : [];

    this.server = server;
    this.topicData = topicData;

    this.state = CLIENT_STATE.active;
    this.registrationDate = new Date();
    this.lastSignOfLife = null;
    this.topicSubscriptionTokens = new Map();
    this.topicSubscriptions = new Map();
    this.regexSubscriptions = new Map();

    this.topicDataTranslator = new ProtobufTranslator(MSG_TYPES.TOPIC_DATA);
    this.publishedTopics = [];
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
    if (state === CLIENT_STATE.active) {
      this.startLifeMonitoring();
    } else if (state === CLIENT_STATE.inactive) {
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
    this.deletePublishedTopics();
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
      if (difference > TIME_UNTIL_DISCONNECT) {
        // The client has probably disconnected unexpectedly and should be removed.
        if (this.state !== CLIENT_STATE.disconnected) {
          namida.log(
            `Client State has changed`,
            `Client with ID ${this.id} is not available and is now in a disconnected state.`
          );
        }
        this.state = CLIENT_STATE.disconnected;
        this.deactivate();
      } else if (difference > TIME_UNTIL_INACTIVE) {
        // The client has the state inactive.
        /*if (this.state !== CLIENT_STATE.inactive) {
          namida.log(
            `Client State has changed`,
            `Client with id ${this.id} is not available and is now in an inactive state.`
          );
        }*/
        this.state = CLIENT_STATE.inactive;
      } else if (difference > TIME_UNTIL_STANDBY) {
        // The client has the state standby.
        /*if (this.state !== CLIENT_STATE.standby) {
          namida.log(
            `Client State has changed`,
            `Client with id ${this.id} is not available and is now in an standby state.`
          );
        }*/
        this.state = CLIENT_STATE.standby;
      } else {
        // The client has the state active.
        /*if (this.state !== CLIENT_STATE.active) {
          namida.log(
            `Client State has changed`,
            `Client with id ${this.id} is available again and is now in an active state.`
          );
        }*/
        this.state = CLIENT_STATE.active;
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
   * Internally subscribe to a topic at the topicData
   * @param {String} topic
   */
  subscribeAtTopicData(topic) {
    if (this.topicSubscriptionTokens.has(topic)) {
      return false;
    }

    // subscribe
    let token = this.topicData.subscribe(topic, (...params) => this.subscriptionCallback(...params));
    this.topicSubscriptionTokens.set(topic, token);

    // check if topic already has data, if so send it to remote
    let topicdata = this.topicData.pull(topic);
    if (topicdata && topicdata.data) {
      this.subscriptionCallback(topic, topicdata);
    }

    return true;
  }

  subscriptionCallback(topic, entry) {
    let payload = {
      topicDataRecord: {
        topic: topic,
        timestamp: entry.timestamp
      }
    };
    payload.topicDataRecord[entry.type] = entry.data;

    try {
      let buffer = this.topicDataTranslator.createBufferFromPayload(payload);
      this.sendMessageToRemote(buffer);
    } catch (error) {
      console.error(error);
    }
  };

  /**
   * Internally unsubscribes from a topic at the topicData.
   * @param {String} topic
   */
  unsubscribeAtTopicData(topic) {
    if (!this.topicSubscriptionTokens.has(topic)) {
      return false;
    }

    // get token
    let token = this.topicSubscriptionTokens.get(topic);

    // unsubscribe
    this.topicData.unsubscribe(token);
    // remove token
    this.topicSubscriptionTokens.delete(topic);

    return true;
  }

  /**
   * Subscribe to a topic, to be called from outside when subscribing to a single topic
   * @param {String} topic
   */
  subscribeTopic(topic) {
    let subscription = this.topicSubscriptions.get(topic);
    if (subscription && subscription.explicit) {
      namida.warn(this.toString(), `subscription skipped, already subscribed to topic ${topic}.`);
      return;
    }

    if (!subscription) {
      let success = this.subscribeAtTopicData(topic);
      // successfully subscribed just now or already subscribed by some other means
      if (success) {
        // add explicit subscription to topic
        this.topicSubscriptions.set(topic, {
          explicit: true,
          regExes: []
        });
      }
    } else {
      subscription.explicit = true;
    }
  }

  /**
   * Unsubscribe from a topic, to be called from outside when unsubscribing from a single topic
   * @param {String} topic
   */
  unsubscribeTopic(topic) {
    let subscription = this.topicSubscriptions.get(topic);

    // no (explicit) subscription?
    if (!subscription || !subscription.explicit) {
      namida.logFailure(
        `Topic Data unsubscription rejected`,
        `Client with ID ${this.id} is not subscribed to topic ${topic}.`
      );
      return;
    }

    // change subscription not to be explicit
    subscription.explicit = false;
    // check if no subscription remaining, if so completely unsub at TopicData and delete entry
    if (subscription.regExes.length === 0) {
      this.unsubscribeAtTopicData(topic);
      this.topicSubscriptions.delete(topic);
    }
  }

  /**
   * Subscribe to a regular expression
   * @param {String} regexString
   */
  subscribeRegex(regexString) {
    if (this.regexSubscriptions.has(regexString)) {
      namida.logFailure(
        `RegExp subscription rejected`,
        `Client with id ${this.id} is already subscribed to this RegExp.`
      );
      return false;
    }

    let regex = new RegExp(regexString);

    // callback to check if necessary to subscribe to certain topic
    let checkSubscriptionForTopic = (topic) => {
      if (regex.test(topic)) {
        let subscription = this.topicSubscriptions.get(topic);

        // no subscription to this topic yet?
        if (!subscription) {
          let success = this.subscribeAtTopicData(topic);
          if (success) {
            // add new subscription to map, regex only for now
            this.topicSubscriptions.set(topic, {
              explicit: false,
              regExes: [regexString]
            });
          }
        }
        // already subscribed explicitly, add subscription via regex
        else {
          subscription.regExes.push(regexString);
        }
      }
    };

    // save regexSubscriptionData
    let regexSubscriptionData = {
      regexString: regexString,
      regex: regex,
      id: this.id,
      type: 'single',
      checkSubscriptionForTopic: checkSubscriptionForTopic
    };
    this.regexSubscriptions.set(regexString, regexSubscriptionData);

    // auto-subscribe on new matching topics
    this.topicData.events.addListener(TOPIC_EVENTS.NEW_TOPIC, checkSubscriptionForTopic);

    // add subscriptions to existing topics
    this.topicData
      .getAllTopicsWithData()
      .map((entry) => entry.topic)
      .forEach(checkSubscriptionForTopic);

    return true;
  }

  /**
   * Unsubscribe from a regular expression
   * @param {String} regexString
   */
  unsubscribeRegex(regexString) {
    if (!this.regexSubscriptions.has(regexString)) {
      namida.logFailure(
        `RegExp unsubscription rejected`,
        `Client with ID ${this.id} is not subscribed to RegExp ${regexString}.`
      );
      return;
    }

    // get subscription data
    let regexSubscriptionData = this.regexSubscriptions.get(regexString);

    // remove checkSubscriptionForTopic
    this.topicData.events.removeListener(
      TOPIC_EVENTS.NEW_TOPIC,
      regexSubscriptionData.checkSubscriptionForTopic
    );

    // remove regex subscription
    this.regexSubscriptions.delete(regexString);

    // check topic subscriptions
    this.topicSubscriptions.forEach((subs, topic) => {
      let index = subs.regExes.indexOf(regexString);
      if (index !== -1) {
        subs.regExes.splice(index, 1);
      }

      // if no subscriptions remain, unsubscribe at TopicData
      if (!subs.explicit && subs.regExes.length === 0) {
        this.unsubscribeAtTopicData(topic);
        this.topicSubscriptions.delete(topic);
      }
    });
  }

  hasRegexSubscription(topic) {
    let sub = this.topicSubscriptions.get(topic);

    if (sub) {
      return sub.regExes.length > 0;
    }

    return false;
  }

  unsubscribeAll() {
    for (let token in this.topicSubscriptionTokens) {
      this.topicData.unsubscribe(token);
    }
    this.topicSubscriptionTokens.clear();
    this.topicSubscriptions.clear();
    this.regexSubscriptions.clear();
  }

  deletePublishedTopics() {
    this.publishedTopics.forEach((topic) => {
      this.topicData.remove(topic);
    });
  }

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
      metadataJson: this.metadataJson
    };
  }

  toString() {
    return 'Client "' + this.name + '" (ID ' + this.id + ')';
  }
}

module.exports = {
  Client: Client,
  CLIENT_STATE: CLIENT_STATE
};
