const { ProtobufTranslator, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const Storage = require('./storage.js');

class TopicDemuxDatabase extends Storage {
  constructor() {
    super('devices/topicDemultiplexer', 'demux');
  }

  /**
   * Add a new demultiplexer protobuf specification based on the specified specification to the specifications list.
   * @param {Object} specification The specification in protobuf format. It requires a name and id property.
   */
  addSpecification(specification) {
    if (!this.verifySpecification(specification)) {
      throw 'Demultiplexer with ID ' + specification.id + ' could not be registered, invalid specs'
    }

    try {
      return super.addSpecification(specification);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a demultiplexer specification that is already present in the specifications list with a new value.
   * @param {Object} specification The specification requires a name and id property.
   */
  updateSpecification(specification) {
    if (!this.verifySpecification(specification)) {
      throw 'Demultiplexer specification could not be verified';
    }

    super.updateSpecification(specification);
  }

  /**
   * Verifies the specified specification.
   * @param {*} specification 
   */
  verifySpecification(specification) {
    let translator = new ProtobufTranslator(MSG_TYPES.TOPIC_DEMUX);
    try {
      return translator.verify(specification);
    }
    catch (error) {
      return false;
    }
  }
}

module.exports = new TopicDemuxDatabase();
