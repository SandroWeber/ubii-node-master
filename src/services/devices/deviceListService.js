const { Service } = require('../service.js');

const { DEFAULT_TOPICS, MSG_TYPES, proto } = require('@tum-far/ubii-msg-formats');

class DeviceListService extends Service {
  constructor(deviceManager, clientManager) {
    super(DEFAULT_TOPICS.SERVICES.DEVICE_GET_LIST, undefined, MSG_TYPES.DEVICE_LIST + ', ' + MSG_TYPES.ERROR);

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

    return { deviceList: { elements: devices } };
  }

  filterDevices(requestedDevices, availableDevices) {
    let responseList = [];

    requestedDevices.forEach((request) => {
      let filtered = availableDevices;
      if (request.id) {
        filtered = filtered.filter((device) => device.id === request.id);
      }
      if (request.name) {
        filtered = filtered.filter((device) => device.name === request.name);
      }
      if (request.tags) {
        filtered = filtered.filter((device) =>
          request.tags.every((requestTag) => device.tags.includes(requestTag))
        );
      }
      if (request.clientId) {
        filtered = filtered.filter((device) => device.clientId === request.clientId);
      }
      if (request.components) {
        filtered = filtered.filter((device) => {
          let matchingComponents = this.filterComponents(request.components, device.components);
          return matchingComponents.length === device.components.length ? true : false;
        });
      }

      responseList = responseList.concat(filtered);
    });

    return responseList;
  }

  filterComponents(requestedComponents, availableComponents) {
    let responseList = [];

    requestedComponents.forEach((request) => {
      let filtered = availableComponents;
      if (request.id) {
        filtered = filtered.filter((component) => component.id === request.id);
      }
      if (request.name) {
        filtered = filtered.filter((component) => component.name === request.name);
      }
      if (request.tags) {
        filtered = filtered.filter((component) =>
          request.tags.every((requestTag) => component.tags.includes(requestTag))
        );
      }
      if (request.deviceId) {
        filtered = filtered.filter((component) => component.deviceId === request.deviceId);
      }
      if (request.topic) {
        filtered = filtered.filter((component) => component.topic === request.topic);
      }
      if (request.ioType) {
        filtered = filtered.filter((component) => component.ioType === request.ioType);
      }
      if (request.messageFormat) {
        filtered = filtered.filter((component) => component.messageFormat === request.messageFormat);
      }

      responseList = responseList.concat(filtered);
    });

    return responseList;
  }
}

module.exports = { DeviceListService };
