const {Service} = require('./../service.js');

const XRHubRoomDatabase = require('../../storage/xrHubRoomDatabase');

class XRHubRoomDataGetService extends Service {
  constructor(){
    super("/services/xr-hub/room/get");
  }

  /**
   * Checks if an room with the given id exists
   * If it exists the room is returned
   * Else the BaseRoom is duplicated and saved as new room and the resulting room is then returned
   * @param roomObject {{roomId:String}}
   * @returns {{error: String}|{success: JSON}|{success: JSON}}
   */
  reply(roomObject){
    try{
      if(XRHubRoomDatabase.getRoom(roomObject.roomId)){
        return {success: XRHubRoomDatabase.getRoom(roomObject.roomId)};
      } else{
        const baseRoom = XRHubRoomDatabase.getRoom("BaseRoom");
        const newRoom = XRHubRoomDatabase.addRoom(baseRoom);
        return  {success: newRoom};
      }
    } catch (e) {
      return {error: e};
    }

  }
}

module.exports = {
  'XRHubRoomDataGetService': XRHubRoomDataGetService
};