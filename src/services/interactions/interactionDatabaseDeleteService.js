const { Service } = require('../service.js');
const InteractionDatabase = require('../../storage/interactionDatabase');

const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class InteractionDatabaseDeleteService extends Service {
  constructor() {
    super(
      DEFAULT_TOPICS.SERVICES.INTERACTION_DATABASE_DELETE,
      MSG_TYPES.INTERACTION,
      MSG_TYPES.SUCCESS + ', ' + MSG_TYPES.ERROR
    );
  }

  reply(interactionMessage) {
    let interaction = InteractionDatabase.getInteraction(interactionMessage.id);
    if (typeof interaction === 'undefined') {
      return {
        error: {
          title: 'InteractionDeleteService Error',
          message: 'Could not find interaction with ID ' + interactionMessage.id
        }
      };
    } else {
      try {
        InteractionDatabase.deleteInteraction(interactionMessage.id);
      } catch (error) {
        return {
          error: {
            title: 'InteractionDeleteService Error',
            message: error
          }
        };
      }

      return {
        success: {
          title: 'InteractionDeleteService',
          message: 'Successfully deleted interaction with ID ' + interactionMessage.id
        }
      };
    }
  }
}

module.exports = {
  InteractionDatabaseDeleteService: InteractionDatabaseDeleteService
};
