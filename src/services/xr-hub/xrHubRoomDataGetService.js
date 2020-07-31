const {Service} = require('./../service.js');

const XRHubRoomDatabase = require('../../storage/xrHubRoomDatabase');

class XRHubRoomDataGetService extends Service {
  constructor(){
    super("/services/xr-hub/room/get");
  }

  reply(roomObject){
    if(XRHubRoomDatabase.getRoom(roomObject.roomId)){
      return {success: XRHubRoomDatabase.getRoom(roomObject.roomId)};
    } else{
      const baseRoom = XRHubRoomDatabase.getRoom("BaseRoom");
      const newRoom = XRHubRoomDatabase.addRoom(baseRoom);
      return  {success: newRoom};
    }
  }
}

module.exports = {
  'XRHubRoomDataGetService': XRHubRoomDataGetService
};