const { Service } = require('./../service.js');
const InteractionDatabase = require('../../storage/interactionDatabase');

const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class InteractionOnlineDatabaseGetListService extends Service {
  constructor() {
    super(
      DEFAULT_TOPICS.SERVICES.INTERACTION_DATABASE_ONLINE_GET_LIST,
      undefined,
      MSG_TYPES.INTERACTION_LIST + ', ' + MSG_TYPES.ERROR
    );
  }

  reply() {
    let interactions = InteractionDatabase.getOnlineSpecificationList();
    if (typeof interactions === 'undefined') {
      return {
        error: {
          title: 'InteractionOnlineDatabaseGetListService Error',
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
  InteractionOnlineDatabaseGetListService: InteractionOnlineDatabaseGetListService
};
