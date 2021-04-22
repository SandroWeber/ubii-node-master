const { Service } = require('../service.js');

const { DEFAULT_TOPICS, MSG_TYPES, proto } = require('@tum-far/ubii-msg-formats');

class DeviceListService extends Service {
  constructor(deviceManager, clientManager) {
    super(
      DEFAULT_TOPICS.SERVICES.DEVICE_GET_LIST,
      undefined,
      MSG_TYPES.DEVICE_LIST + ', ' + MSG_TYPES.ERROR
    );

    this.deviceManager = deviceManager;
    this.clientManager = clientManager;
  }

  reply() {
    let devices = this.deviceManager.getAllParticipants()
      .filter(device => this.clientManager.getClient(device.clientId).state !== proto.ubii.clients.Client.State.UNAVAILABLE)
      .map((device) => device.toProtobuf());

    return { deviceList: { elements: devices } };
  }
}

module.exports = { DeviceListService };
