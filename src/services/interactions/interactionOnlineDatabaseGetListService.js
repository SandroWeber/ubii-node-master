const {Service} = require('./../service.js');
const InteractionDatabase = require('../../storage/interactionDatabase');

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class InteractionOnlineDatabaseGetListService extends Service {
  constructor() {
    super(DEFAULT_TOPICS.SERVICES.INTERACTION_ONLINE_DATABASE_GET_LIST);
  }

  reply() {
    let interactions = InteractionDatabase.getOnlineSpecificationList();
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
  'InteractionOnlineDatabaseGetListService': InteractionOnlineDatabaseGetListService
};