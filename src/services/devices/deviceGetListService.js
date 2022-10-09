const { DEFAULT_TOPICS, MSG_TYPES, proto } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../service.js');
const FilterUtils = require('../../utils/filterUtils');

class DeviceGetListService extends Service {
  constructor(deviceManager, clientManager) {
    super(DEFAULT_TOPICS.SERVICES.DEVICE_GET_LIST, 'none, ' + MSG_TYPES.DEVICE_LIST, MSG_TYPES.DEVICE_LIST + ', ' + MSG_TYPES.ERROR);

    this.deviceManager = deviceManager;
    this.clientManager = clientManager;
  }

  reply(request) {
    let devices = this.deviceManager
      .getAllParticipants()
      .filter(
        (device) => this.clientManager.getClient(device.clientId).state !== proto.ubii.clients.Client.State.UNAVAILABLE
      )
      .map((device) => device.toProtobuf());
    if (request && request.elements) {
      devices = FilterUtils.filterAll(request.elements, devices);
    }

    return { deviceList: { elements: devices } };
  }
}

module.exports = { DeviceGetListService };
