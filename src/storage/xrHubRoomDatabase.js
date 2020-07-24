const Storage = require('./storage.js');

class XRHubRoomDatabase extends Storage {

  constructor(){
    super("xr-hub-rooms", "xr-hub-room");
    this.initBaseRoom();
  }

  initBaseRoom(){
    const baseRoom = JSON.parse(this.readBaseRoomJson());
    this.specificationsLocal.set("BaseRoom", baseRoom);
    try{
      this.saveSpecificationToFile(baseRoom);
    } catch(e){
      console.info("Couldn't save base room spec into file. Probably already exists.");
    }
  }


  readBaseRoomJson(){
    const fs = require('fs');
    const path = require('path');

    return bufferFile('data/BaseRoomJSON.json').toString();

    function bufferFile(relPath) {
      return fs.readFileSync(path.join(__dirname, relPath), {encoding: 'utf8'});
    }
  }

  /**
   * Returns whether a room specification with the specified ID exists.
   * @param {String} roomId
   * @returns {Boolean} Does a room specification with the specified ID exists?
   */
  hasRoom(roomId) {
    return this.hasSpecification(roomId);
  }

  /**
   * Get the room with the specified id.
   * @param {String} roomId
   */
  getRoom(roomId) {
    return this.getSpecification(roomId);
  }

  /**
   * Add a new session protobuf specification based on the specified specification to the specifications list.
   * @param {Object} roomObject The specification in protobuf format. It requires a name and id property.
   */
  addRoom(roomObject) {
    try {
      return this.addSpecification(roomObject);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete the room specification with the specified id from the specifications list.
   * @param {String} roomId
   */
  deleteRoom(roomId) {
    this.deleteSpecification(roomId);
  }

  /**
   * Update a room specification that is already present in the specifications list with a new value.
   * @param {Object} partialSpec partial specification of the room.
   * @param {String} roomId id of the room the partial specification belongs to
   */
  updateRoom(partialSpec, roomId) {
    if (!this.hasRoom(roomId)) {
      throw 'room with id ${roomId} could not be found';
    }
    // TODO: implement update of room upodating the Object3D values individually
    this.updateSpecification(specification);
  }
}

module.exports = new XRHubRoomDatabase();