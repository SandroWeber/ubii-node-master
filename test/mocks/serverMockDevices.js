class TopicDataMock {
  constructor() {
    this.publish = () => {
      this.publishCounter++;
    };
    this.publishCounter = 0;

    this.subscribe = () => {
      this.subscribeCounter++;
    };
    this.subscribeCounter = 0;

    this.unsubscribe = () => {
      this.unsubscribeCounter++;
    };
    this.unsubscribeCounter = 0;

    this.getAllTopicsWithData = () => {
      this.getAllTopicsWithDataCounter++;

      return [
        {
          topic: 'testtopic1',
          data: {
            type: 'number',
            value: 13.6
          }
        },
        {
          topic: 'testtopic2',
          data: {
            type: 'string',
            value: 'hallo'
          }
        }
      ];
    };
    this.getAllTopicsWithDataCounter = 0;

    this.subscribeAll = () => {
      this.subscribeAllCounter++;

      return 'I am a dummy token';
    };
    this.subscribeAllCounter = 0;
  }
}

let createDeviceSpecificationMock = function (id, deviceType) {
  return {
    clientId: 'clientId',
    name: 'displayName',
    namespace: 'namespace',
    id: id,
    deviceType: deviceType
  };
};

module.exports = {
  TopicDataMock: TopicDataMock,
  createDeviceSpecificationMock: createDeviceSpecificationMock
};
