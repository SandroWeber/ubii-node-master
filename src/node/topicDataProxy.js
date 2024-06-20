const namida = require('@tum-far/namida/src/namida');
const { ConfigService } = require('@tum-far/ubii-node-nodejs');

const LOG_TAG = 'TopicDataProxy';

class TopicDataProxy {
  constructor(topicData) {
    this.topicData = topicData;
    this.mapTopic2PublishingClients = new Map();

    if (ConfigService.instance.config.clients.permitPublishingOnSharedTopic) {
      this.publishRecord = (record, clientID) => {
        if (clientID !== undefined) {
          let clients = this.mapTopic2PublishingClients.get(record.topic);
          if (clients === undefined) {
            this.mapTopic2PublishingClients.set(record.topic, [clientID]);
          } else if (!clients.includes(clientID)) {
            clients.push(clientID);
          }
        }
    
        this.topicData.publish(record.topic, record);
      };
    } else {
      this.publishRecord = (record, clientID) => {
        if (!this.mapTopic2PublishingClients.has(record.topic)) {
          this.mapTopic2PublishingClients.set(record.topic, clientID);
          this.topicData.publish(record.topic, record);
        } else {
          if (this.topicBelongsToClient(record.topic, clientID)) {
            this.topicData.publish(record.topic, record);
          } else {
            namida.warn(LOG_TAG, 'Client (ID ' + clientID + ') is trying to publish on foreign topic "' + record.topic + '", prevented by config settings');
          }
        }
      };
    }
  }

  pull(topic) {
    return this.topicData.pull(topic);
  }

  /**
   * Subscribe a callback to a given topic.
   * @param {string} topic
   * @param {function} callback
   *
   * @returns {object} Subscription token, save to later unsubscribe
   */
  async subscribeTopic(topic, callback) {
    return this.topicData.subscribeTopic(topic, callback);
  }

  /**
   * Subscribe to the specified regex.
   * @param {*} regexString
   * @param {*} callback
   */
  async subscribeRegex(regex, callback) {
    return this.topicData.subscribeRegex(regex, callback);
  }

  /**
   * Unsubscribe at topicdata and possibly at master node.
   * @param {*} token
   */
  async unsubscribe(token) {
    return this.topicData.unsubscribe(token);
  }

  publishRecord(record) {
    this.topicData.publish(record.topic, record);
  }

  publishRecordImmediately(record) {
    this.publishRecord(record);
  }

  publishRecordList(recordList) {
    for (const record of recordList) {
      this.publishRecord(record);
    }
  }

  topicBelongsToClient(topic, clientID) {
    const client = this.mapTopic2PublishingClients.get(topic);
    if (client !== undefined && client === clientID) {
      return true;
    } else {
      return false;
    }
  }

  cleanUpTopicsForClient(clientID) {
    this.mapTopic2PublishingClients.forEach((clients, topic) => {
      if (clients === clientID) {
        this.topicData.remove(topic);
      } else if (clients !== undefined && clients.length === 1 && clients[0] === clientID) {
        this.topicData.remove(topic);
      }
    })
  }
}

module.exports = TopicDataProxy;
