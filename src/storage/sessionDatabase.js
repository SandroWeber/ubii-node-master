const {Session} = require('../sessions/session');
const {ProtobufTranslator, MSG_TYPES} = require('@tum-far/ubii-msg-formats');
const Storage = require('./storage.js');

class SessionDatabase extends Storage{
  constructor() {
    super('sessions', 'session');
  }

  /**
   * Get the session with the specified id.
   * @param {String} id 
   */
  getSession(id) {
    return this.getSpecification(id);
  }

  /**
   * Get an array of all specifications.
   */
  getSessionList() {
    return this.getSpecificationList();
  }

  /**
   * Add a new session protobuf specification based on the specified specification to the specifications list. Returns the corresponding session.
   * @param {Object} specification The specification in protobuf format. It requires a name and id property.
   * @returns Returns an session that corresponds to the specified specification.
   */
  addSession(specification) {
    if (!this.verifySpecification(specification)) {
      throw 'Session with ID ' + specification.id + ' could not be registered, invalid specs'
    }

    try {
      let session = new Session(specification);
      let sessionSpecification = session.toProtobuf();

      this.addSpecification(sessionSpecification);

      return session;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete the session specification with the specified id from the specifications list.
   * @param {String} id 
   */
  deleteSession(id) {
    this.deleteSpecification(id);
  }

  /**
   * Update a session specification that is already present in the specifications list with a new value.
   * @param {Object} specification The specification requires a name and id property.
   */
  updateSessionSpecs(specification) {
    if (!this.verifySpecification(specification)) {
      throw 'session specification could not be verified';
    }

    this.updateSpecification(specification);
  }

  /**
   * Verifies the specified specification.
   * @param {*} specification 
   */
  verifySpecification(specification) {
    let translator = new ProtobufTranslator(MSG_TYPES.SESSION);
    try {
      return translator.verify(specification);
    }
    catch (error) {
      return false;
    }
  }
}

module.exports = new SessionDatabase();
