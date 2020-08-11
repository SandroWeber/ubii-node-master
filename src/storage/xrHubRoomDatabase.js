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
   * @param {String} roomId id of the room the partial specification belongs to
   * @param {Object} newObjectString partial specification of the room.
   */
  updateRoom(roomId, newObjectString) {
    console.log("updating room");
    let room = this.getRoom(roomId);
    if (!room) {
      throw 'room with id ${roomId} could not be found';
    }
    const newObject = JSON.parse(newObjectString).object;
    let sceneObject = room.webGL.object;
    if(newObject.userData.url){
      sceneObject = room.css3D.object;
    }
    const updatedObject = this.findAndUpdateChildObject(sceneObject, newObject);
    if(updatedObject){
     console.debug("Successfully updated object in room", updatedObject);
    } else{
      console.debug("Couldn't find object in room", newObject);
    }
    this.updateSpecification(room);
  }


  /**
   * Recursively searches for the object in the children of the given object, if found it replaces it with the updatedObject and returns it
   * If not found it returns undefined
   * @param parentObject
   * @param objectToUpdate
   * @returns object
   */
  findAndUpdateChildObject(parentObject, objectToUpdate){
    if(!parentObject.children){
      return undefined;
    }
    for(const [index, child] of parentObject.children.entries()){
      if(child.uuid === objectToUpdate.uuid){
        parentObject.children[index] = objectToUpdate;
        return parentObject.children[index];
      }
      const childSearchResult = this.findAndUpdateChildObject(child, objectToUpdate);
      if(childSearchResult){
        return childSearchResult;
      }
    }
    return undefined;
  }
}

module.exports = new XRHubRoomDatabase();