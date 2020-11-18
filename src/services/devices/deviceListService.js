const { Service } = require('../service.js');

const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class DeviceListService extends Service {
  constructor(deviceManager) {
    super(
      DEFAULT_TOPICS.SERVICES.DEVICE_GET_LIST,
      undefined,
      MSG_TYPES.DEVICE_LIST + ', ' + MSG_TYPES.ERROR
    );

    this.deviceManager = deviceManager;
  }

  reply() {
    let devices = this.deviceManager.getAllParticipants().map((device) => device.toProtobuf());

    return { deviceList: { elements: devices } };
  }
}

module.exports = { DeviceListService };
