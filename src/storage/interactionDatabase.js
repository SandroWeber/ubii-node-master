const {ProtobufTranslator, MSG_TYPES} = require('@tum-far/ubii-msg-formats');
const Storage = require('./storage.js');

class InteractionDatabase extends Storage{
  constructor() {
    super('interactions', 'interaction');
  }

  getInteraction(id) {
    return this.getSpecification(id);
  }

  getInteractionList() {
    return this.getSpecificationList();
  }

  addInteraction(specification) {
    if (!this.verifySpecification(specification)) {
      throw 'Interaction with ID ' + specification.id + ' could not be registered, invalid specs'
    }

    this.addSpecification(specification);
  }

  deleteInteraction(id) {
    this.deleteSpecification(id);
  }

  updateInteractionSpecs(specification) {
    if (!this.verifySpecification(specification)) {
      throw 'interaction specification could not be verified';
    }

    this.updateSpecification(specification);
  }

  verifySpecification(specification) {
    let translator = new ProtobufTranslator(MSG_TYPES.INTERACTION);
    let result = false;
    try {
      result = translator.verify(specification);
    }
    catch (error) {
      result = false;
    }

    return result;
  }
}

module.exports = new InteractionDatabase();
