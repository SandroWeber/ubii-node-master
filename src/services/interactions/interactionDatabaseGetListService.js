const { Service } = require('./../service.js');
const InteractionDatabase = require('../../storage/interactionDatabase');

const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class InteractionDatabaseGetListService extends Service {
  constructor() {
    super(
      DEFAULT_TOPICS.SERVICES.INTERACTION_DATABASE_GET_LIST,
      undefined,
      MSG_TYPES.INTERACTION_LIST + ', ' + MSG_TYPES.ERROR
    );
  }

  reply() {
    let interactions = InteractionDatabase.getInteractionList();
    if (typeof interactions === 'undefined') {
      return {
        error: {
          title: 'InteractionDatabaseGetListService Error',
          message: 'Could not retrieve interaction list'
        }
      };
    } else {
      return {
        interactionList: interactions
      };
    }
  }
}

module.exports = {
  InteractionDatabaseGetListService: InteractionDatabaseGetListService
};
