const { Service } = require('./service.js');
const namida = require('@tum-far/namida');

const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class SubscriptionService extends Service {
  constructor(clientManager, topicData) {
    super(
      DEFAULT_TOPICS.SERVICES.TOPIC_SUBSCRIPTION,
      MSG_TYPES.SERVICE_REUEST_TOPIC_SUBSCRIPTION,
      MSG_TYPES.SUCCESS + ', ' + MSG_TYPES.ERROR
    );

    this.clientManager = clientManager;
    this.topicData = topicData;
  }

  reply(message) {
    // Extract the relevant information.
    let clientID = message.clientId;

    // Verify the device and act accordingly.
    if (!this.clientManager.verifyClient(clientID)) {
      let errorTitle = 'SubscriptionService';
      let errorMessage = 'There is no client registered with the ID ' + clientID;

      namida.logFailure(errorTitle, errorMessage);

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
