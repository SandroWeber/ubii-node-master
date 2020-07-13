const { Service } = require('./../service.js');
const InteractionDatabase = require('../../storage/interactionDatabase');

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class InteractionLocalDatabaseGetListService extends Service {
  constructor() {
    super(DEFAULT_TOPICS.SERVICES.INTERACTION_DATABASE_LOCAL_GET_LIST);
  }

  reply() {
    let interactions = InteractionDatabase.getLocalSpecificationList();
    if (typeof interactions === 'undefined') {
      return {
        error: {
          title: 'InteractionLocalDatabaseGetListService Error',
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
  InteractionLocalDatabaseGetListService: InteractionLocalDatabaseGetListService
};
