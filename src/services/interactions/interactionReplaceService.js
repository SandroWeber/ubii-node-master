const {Service} = require('./../service.js');
const InteractionDatabase = require('../../storage/interactionDatabase');

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class InteractionReplaceService extends Service {
  constructor() {
    super(DEFAULT_TOPICS.SERVICES.INTERACTION_REPLACE);
  }

  reply(interactionMessage) {
    if (!InteractionDatabase.verifySpecification(interactionMessage)) {
      return {
        error: {
          title: 'InteractionGetService Error',
          message: 'Could not verify interaction with ID ' + interactionMessage.id
        }
      };
    }

    try {
      InteractionDatabase.updateInteractionSpecs(interactionMessage);
    } catch (error) {
      return {
        error: {
          title: 'InteractionGetService Error',
          message: error.toString()
        }
      };
    }
  }
}

module.exports = {
  'InteractionReplaceService': InteractionReplaceService
};