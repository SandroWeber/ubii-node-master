const { Service } = require('../service.js');
const { Interaction } = require('../../sessions/interaction.js');
const InteractionDatabase = require('../../storage/interactionDatabase');

const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class InteractionDatabaseSaveService extends Service {
  constructor() {
    super(
      DEFAULT_TOPICS.SERVICES.INTERACTION_DATABASE_SAVE,
      MSG_TYPES.INTERACTION + ', ' + MSG_TYPES.INTERACTION_LIST,
      MSG_TYPES.INTERACTION_LIST + ', ' + MSG_TYPES.ERROR
    );
  }

  reply(interactionSpecs) {
    if (typeof interactionSpecs === 'undefined') {
      return {
        error: {
          title: 'InteractionDatabaseSaveService Error',
          message: 'Interaction specifications are undefined.'
        }
      };
    }

    if (!Array.isArray(interactionSpecs)) {
      interactionSpecs = [interactionSpecs];
    }

    let newInteractions = [];
    interactionSpecs.forEach((spec) => {
      try {
        // new interaction
        if (!spec.id || spec.id === '') {
          spec.id = undefined; // ID is assigned by server upon creation
          let interaction = new Interaction(spec);
          newInteractions.push(interaction);
          InteractionDatabase.addInteraction(interaction.toProtobuf());
        }
        // update existing interaction (known ID)
        else {
          InteractionDatabase.updateInteraction(spec);
        }
      } catch (error) {
        return {
          error: {
            title: 'InteractionDatabaseSaveService Error',
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
}

module.exports = {
  InteractionDatabaseSaveService: InteractionDatabaseSaveService
};
