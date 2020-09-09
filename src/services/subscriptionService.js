const { Service } = require('./service.js');
const namida = require('@tum-far/namida');

const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class SubscriptionService extends Service {
  constructor(clientManager, topicData) {
    super(
      DEFAULT_TOPICS.SERVICES.TOPIC_SUBSCRIPTION,
      MSG_TYPES.TOPIC_SUBSCRIPTION,
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
      // Prepare the context.
      let context = this.prepareContext();

      // Update the context feedback.
      context.feedback.message =
        `There is no client registered with the id ${namida.style.messageHighlight(clientID)}. ` +
        `Subscription was rejected due to an unregistered device.`;
      context.feedback.title = 'Subscription rejected';

      namida.logFailure(context.feedback.title, context.feedback.message);

      return {
        error: {
          title: context.feedback.title,
          message: context.feedback.message,
          stack: context.feedback.stack
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
