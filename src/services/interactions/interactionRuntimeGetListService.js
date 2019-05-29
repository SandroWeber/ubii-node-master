const {Service} = require('./../service.js');
const InteractionDatabase = require('../../storage/interactionDatabase');

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class InteractionRuntimeGetListService extends Service {
  constructor() {
    super(DEFAULT_TOPICS.SERVICES.INTERACTION_RUNTIME_GET_LIST);
  }

  reply() {
    // Todo: Change to runtime
    let interactions = InteractionDatabase.getInteractionList();
    if (typeof interactions === 'undefined') {
      return {
        error: {
          title: 'InteractionRuntimeGetListService Error',
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
  'InteractionRuntimeGetListService': InteractionRuntimeGetListService
};