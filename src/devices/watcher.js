const { v4: uuidv4 } = require('uuid');

const {Device} = require('./device.js');
const {ProtobufTranslator, MSG_TYPES} = require('@tum-far/ubii-msg-formats');

/**
 * Watchers are representations of remote entities at the server that passively interact with the ubii system.
 * They get all data by subscribing to all current and future topics automatically on registration.
 */
class Watcher extends Device {
  constructor({id = uuidv4(), name = '', deviceType = undefined, components = [], clientId = undefined},
              client, topicData) {
    super({id: id, name: name, deviceType: deviceType, components: components, clientId: clientId}, client);

    this.topicData = topicData;
    this.topicDataTranslator = new ProtobufTranslator(MSG_TYPES.TOPIC_DATA);

    this.subscriptionAllToken = null;
  }

  /**
   * Fetch all current data entries at the topicData and publish them to the remote.
   */
  introduceTopicDataToRemote() {
    // First we get the complete topic data storage snapshot (subtree of the root) from the topic data
    let currentTopicDataRecords = this.topicData.getAllTopicsWithData();

    // Then we iterate over the snapshot and publish every topic to the watcher device
    let i, il = currentTopicDataRecords.length;
    for (i = 0; i < il; i++) {
      let payload = {
        deviceIdentifier: 'masterNode',
        topicDataRecord: {
          topic: currentTopicDataRecords[i].topic
        }
      };
      payload.topicDataRecord[currentTopicDataRecords[i].data.type] = currentTopicDataRecords[i].data.value;

      let buffer = this.topicDataTranslator.createBufferFromPayload(payload);

      this.sendMessageToRemote(buffer);
    }
  }

  /**
   * Subscribe to all topics at the topicData.
   */
  subscribeAll() {
    if (this.subscriptionAllToken !== null && this.subscriptionAllToken !== undefined) {
      logbook.logFail(`Topic Data subscription rejected`,
        `Device (Watcher) with id ${this.identifier} is already subscribed to all.`);
      return;
    }

    // Subscribe to all.
    let token = this.topicData.subscribeAll((record) => {
      let payload = {
        deviceIdentifier: 'masterNode',
        topicDataRecord: record
      };
      let buffer = this.topicDataTranslator.createBufferFromPayload(payload);

      this.sendMessageToRemote(buffer);
    });

    // Save the token.
    this.subscriptionAllToken = token;
  }

  /**
   * Deactivate the client: clear all intervalls, unsubsribe from all topics, ...
   * You should call this method before clearing all references to a client.
   */
  deactivate() {
    this.topicData.unsubscribe(this.subscriptionAllToken);
  }
}

module.exports = {
  'Watcher': Watcher
}