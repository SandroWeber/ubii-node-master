const {Service} = require('./../service.js');

const XRHubRoomDatabase = require('../../storage/xrHubRoomDatabase');

class XRHubRoomDataGetService extends Service {
  constructor(){
    super("/services/xr-hub/room/get");
  }

  reply(roomId){
    if(!roomId){
      const baseRoom = XRHubRoomDatabase.getRoom("BaseRoom");
      const newRoom = XRHubRoomDatabase.addRoom(baseRoom);
      return  {success: newRoom};
    } else{
      return {success: XRHubRoomDatabase.getRoom("roomId")};
    }
  }
}

module.exports = {
  'XRHubRoomDataGetService': XRHubRoomDataGetService
};