const { ProtobufTranslator, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const { Storage, FileHandler, StorageEntry } = require('./storage.js');

class SessionDatabase extends Storage {
  constructor() {
    let fileHandlerProto = new FileHandler(
      '.session',
      // read
      (filepath) => {
        let file = fs.readFileSync(filepath);
        let proto = JSON.parse(file);
        let entry = new StorageEntry(proto.name, filepath);
        entry.protobuf = proto;
        entry.createInstance = () => {
          return new ProcessingModule(proto);
        };
        return entry;
      },
      // write
      (filepath, protoSpecs) => {
        try {
          fs.writeFileSync(filepath, JSON.stringify(protoSpecs, null, 4), { flag: 'wx' });
        } catch (error) {
          if (error) throw error;
        }
      }
    );
    let mapFileHandlers = new Map();
    mapFileHandlers.set(fileHandlerProto.fileEnding, fileHandlerProto);
    super('processing', mapFileHandlers);
  }

  /**
   * Returns whether a session specification with the specified ID exists.
   * @param {String} id
   * @returns {Boolean} Does a session specification with the specified ID exists?
   */
  hasSession(specs) {
    return this.hasSpecification(specs);
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
   * Add a new session protobuf specification based on the specified specification to the specifications list.
   * @param {Object} specification The specification in protobuf format. It requires a name and id property.
   * @param {Object} sessionManager A reference tot he sessionmanager is required to create session instances.
   */
  addSession(specification) {
    if (!this.verifySpecification(specification)) {
      throw 'Session with ID ' + specification.id + ' could not be registered, invalid specs';
    }

    try {
      return this.addSpecification(specification);
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
  updateSession(specification) {
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
    } catch (error) {
      return false;
    }
  }
}

module.exports = new SessionDatabase();
