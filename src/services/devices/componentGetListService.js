const { DEFAULT_TOPICS, MSG_TYPES, proto } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../service.js');
const FilterUtils = require('../../utils/filterUtils');
const { ClientManager } = require('../../clients/clientManager');
const { DeviceManager } = require('../../devices/deviceManager');
const namida = require('@tum-far/namida');

class ComponentGetListService extends Service {
  static LOG_TAG = "ComponentGetListService";

  static DESCRIPTION =
    'Get list of available components. Optionally provide a ComponentList in request to filter by component profiles.';
  static TAGS = ['component', 'components', 'ubii.devices.ComponentList', 'get', 'filter'];

  constructor() {
    super(
      DEFAULT_TOPICS.SERVICES.COMPONENT_GET_LIST,
      MSG_TYPES.COMPONENT_LIST,
      MSG_TYPES.COMPONENT_LIST + ', ' + MSG_TYPES.ERROR
    );

    this.description = ComponentGetListService.DESCRIPTION;
    this.tags = ComponentGetListService.TAGS;
  }

  reply(request) {
    if (request === undefined) {
      namida.error(LOG_TAG, 'request == ' + request);
      return;
    }

    let devices = DeviceManager.instance
      .getAllParticipants()
      .filter(
        (device) =>
          ClientManager.instance.getClient(device.clientId).state !== proto.ubii.clients.Client.State.UNAVAILABLE
      )
      .map((device) => device.toProtobuf());

    let components = [];
    for (let device of devices) {
      components = components.concat(device.components);
    }

    // request == ComponentList
    if (request.elements) {
      components = FilterUtils.filterAll(request.elements, components);
    }
    // request == Component (single)
    else {
      components = FilterUtils.filterAll([request], components);
    }

    return { componentList: { elements: components } };
  }
}

module.exports = ComponentGetListService;
