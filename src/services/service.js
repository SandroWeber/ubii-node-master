class Service {
  constructor(topic, requestMessageFormat, responseMessageFormat) {
    if (new.target === Service) {
      throw new TypeError('Cannot construct Service instances directly');
    }

    if (this.reply === undefined) {
      throw new TypeError('Must override reply');
    }

    this.topic = topic;
    this.requestMessageFormat = requestMessageFormat;
    this.responseMessageFormat = responseMessageFormat;
  }

  toProtobuf() {
    return {
      topic: this.topic,
      requestMessageFormat: this.requestMessageFormat,
      responseMessageFormat: this.responseMessageFormat,
      tags: this.tags,
      description: this.description
    };
  }
}

module.exports = {
  Service: Service
};
