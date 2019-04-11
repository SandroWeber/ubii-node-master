const {Service} = require('./../service.js');
const InteractionDatabase = require('../../storage/interactionDatabase');

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class InteractionGetListService extends Service {
  constructor() {
    super(DEFAULT_TOPICS.SERVICES.INTERACTION_GET_LIST);
  }

  reply() {
    let interactions = InteractionDatabase.getInteractionList();
    if (typeof interactions === 'undefined') {
      return {
        error: {
          title: 'InteractionGetListService Error',
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
  'InteractionGetListService': InteractionGetListService
};