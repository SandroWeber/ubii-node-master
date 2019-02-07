const {ZmqRequest} = require('@tum-far/ubii-msg-transport');

const { ProtobufTranslator } = require('@tum-far/ubii-msg-formats');


class ServiceClient {
  constructor(port) {
    this.serviceClient = new ZmqRequest(port,
      (request) => {
        this.zmqProcessRequest(request)
      },
      true
    );

    this.services = new Map();

    this.msgTypeServiceRequest = 'ubii.service.ServiceRequest';
    this.serviceRequestTranslator = new ProtobufTranslator(this.msgTypeServiceRequest);
  }

  addService(service) {
    if (this.services.has(service.topic)) {
      console.warn('Service for topic "' + service.topic + '" already registered.');
      return;
    }

    this.services.set(service.topic, service);
  }

  removeService(topic) {
    this.services.delete(topic);
  }

  zmqProcessRequest(requestBuffer) {
    let requestMsg = this.serviceRequestTranslator.createMessageFromBuffer(requestBuffer);

    return this.services.get(requestMsg.topic).reply(requestMsg[requestMsg.type]);
  }

  getTopicList() {
    let list = [];
    this.services.forEach((service, topic) => {
      list.push(topic);
    });

    return list;
  }
}

module.exports = ServiceClient;