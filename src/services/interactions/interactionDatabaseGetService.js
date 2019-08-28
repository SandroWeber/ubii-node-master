const {Service} = require('./../service.js');
const InteractionDatabase = require('../../storage/interactionDatabase');

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class InteractionDatabaseGetService extends Service {
  constructor() {
    super(DEFAULT_TOPICS.SERVICES.INTERACTION_DATABASE_GET);
  }

  reply(interactionMessage) {
    let interaction = InteractionDatabase.getInteraction(interactionMessage.id);
    if (typeof interaction === 'undefined') {
      return {
        error: {
          title: 'InteractionDatabaseGetService Error',
          message: 'Could not find interaction with ID ' + interactionMessage.id
        }
      };
    } else {
      return {interaction: interaction};
    }
  }
}

module.exports = {
  'InteractionDatabaseGetService': InteractionDatabaseGetService
};