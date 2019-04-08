const {Interaction} = require('../sessions/interaction');

const {
  Service
} = require('./service.js');
const InteractionDatabase = require('../storage/interactionDatabase');

const { DEFAULT_TOPICS } = require('@tum-far/ubii-msg-formats');

class InteractionRegistrationService extends Service {
  constructor() {
    super(DEFAULT_TOPICS.SERVICES.INTERACTION_REGISTRATION);
  }

  reply(interactionSpecs) {
    if (typeof interactionSpecs === 'undefined') {
      return {
        error: {
          title: 'InteractionRegistrationService Error',
          message: 'Interaction specifications are undefined.'
        }
      };
    }

    let interaction;
    try {
      interaction = InteractionDatabase.registerInteraction(interactionSpecs);
    } catch (error) {
      return {
        error: {
          title: 'InteractionRegistrationService Error',
          message: error.toString()
        }
      };
    }

    return {interaction: interaction.toProtobuf()};
  }
}

module.exports = {
  'InteractionRegistrationService': InteractionRegistrationService
};