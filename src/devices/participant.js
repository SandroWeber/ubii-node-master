const { Device } = require('./device.js');

/**
 * Participants are representations of remote entities at the server that actively interact with the ubii system.
 * They participate in the ubii system by publishing data (they produce data) and/or consuming data via subscriptions (they consume data).
 */
class Participant extends Device {
  constructor(specs, client, topicData) {
    super(specs, client);

    this.topicData = topicData;
    //this.subscriptionTokens = new Map();
  }

  /**
   * Deactivate the client: clear all intervalls, unsubsribe from all topics, ...
   * You should call this method before clearing all references to a client.
   */
  deactivate() {
    // unsubscribe all
    for (let t in this.subscriptionTokens) {
      this.topicData.unsubscribe(t);
    }
  }
}

module.exports = {
  Participant: Participant
};
