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

  prepareContext() {
    return {
      feedback: {
        title: '',
        message: '',
        stack: ''
      },
      success: false
    };
  }
}

module.exports = {
  Service: Service
};
