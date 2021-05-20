const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('./service.js');

class ServiceListService extends Service {
  constructor(serviceManager) {
    super(DEFAULT_TOPICS.SERVICES.SERVICE_LIST, undefined, MSG_TYPES.SERVICE_LIST);

    this.serviceManager = serviceManager;
  }

  reply() {
    let serviceSpecsList = this.serviceManager.getServiceListProtoSpecs();

    return {
      serviceList: {
        elements: serviceSpecsList
      }
    };
  }
}

module.exports = {
  ServiceListService: ServiceListService
};
