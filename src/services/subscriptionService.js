const namida = require('@tum-far/namida');
const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('./service.js');
const FilterUtils = require('../utils/filterUtils');

const LOG_TAG = 'SubscriptionService';

class SubscriptionService extends Service {
  constructor(clientManager) {
    super(
      DEFAULT_TOPICS.SERVICES.TOPIC_SUBSCRIPTION,
      MSG_TYPES.SERVICE_REUEST_TOPIC_SUBSCRIPTION,
      MSG_TYPES.SUCCESS + ', ' + MSG_TYPES.ERROR
    );

    this.clientManager = clientManager;
  }

  reply(message) {
    // Extract the relevant information.
    let clientID = message.clientId;

    // Verify the device and act accordingly.
    if (!this.clientManager.verifyClient(clientID)) {
      let errorTitle = 'SubscriptionService';
      let errorMessage = 'There is no client registered with the ID ' + clientID;

      namida.logFailure(LOG_TAG, errorMessage);

      return {
        error: {
          title: errorTitle,
          message: errorMessage
        }
      };
    }

    let client = this.clientManager.getClient(clientID);

    // Process subscribe topics and unsubscribe topics
    message.subscribeTopics &&
      message.subscribeTopics.forEach((subscribeTopic) => {
        client.subscribeTopic(subscribeTopic);
      });

    message.unsubscribeTopics &&
      message.unsubscribeTopics.forEach((unsubscribeTopic) => {
        client.unsubscribeTopic(unsubscribeTopic);
      });

    // process (un)subscribe regexp
    if (message.subscribeTopicRegexp) {
      message.subscribeTopicRegexp.forEach((regex) => {
        client.subscribeRegex(regex);
      });
    }

    if (message.unsubscribeTopicRegexp) {
      message.unsubscribeTopicRegexp.forEach((regex) => {
        client.unsubscribeRegex(regex);
      });
    }

    if (message.subscribeComponents.length > 0) {
      for (let componentProfile of message.subscribeComponents) {
        let subscription = client.getComponentSubscription(componentProfile);
        if (typeof subscription === 'undefined') {
          client.addComponentSubscription(componentProfile);
        }
      }
    }

    if (message.unsubscribeComponents.length > 0) {
      namida.logFailure(LOG_TAG, 'unsubscribeComponents not implemented!');
    }

    // Reply with success message
    return {
      success: {
        title: 'Success',
        message: 'Successfully processed all Subscriptions.'
      }
    };
  }
}

module.exports = {
  SubscriptionService: SubscriptionService
};
