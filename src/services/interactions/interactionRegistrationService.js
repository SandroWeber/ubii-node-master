const { Service } = require('./../service.js');
const { Interaction } = require('./../../sessions/interaction.js');
const InteractionDatabase = require('../../storage/interactionDatabase');

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

    if (Array.isArray(interactionSpecs)) {
      let newInteractions = [];
      interactionSpecs.forEach((spec) => {
        try {
          spec.id = undefined; // ID is assigned by server upon creation
          let interaction = new Interaction(spec);
          newInteractions.push(interaction);
          InteractionDatabase.addInteraction(interaction.toProtobuf());
        } catch (error) {
          return {
            error: {
              title: 'InteractionRegistrationService Error',
              message: error.toString()
            }
          };
        }
      });

      return {
        interactionList: newInteractions.map((interaction) => {
          return interaction.toProtobuf();
        })
      };
    }

    try {
      interactionSpecs.id = undefined; // ID is assigned by server upon creation
      let interaction = new Interaction(interactionSpecs);
      InteractionDatabase.addInteraction(interaction.toProtobuf());

      return { interaction: interaction.toProtobuf() };
    } catch (error) {
      return {
        error: {
          title: 'InteractionRegistrationService Error',
          message: error.toString()
        }
      };
    }
  }
}

module.exports = {
  InteractionRegistrationService: InteractionRegistrationService
};
