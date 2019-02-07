
const ServiceReplyTranslator = require('@tum-far/ubii-msg-formats/src/js/messageTranslator/serviceReplyTranslator');

class Service {
    constructor(topic) {
        if (new.target === Service) {
            throw new TypeError("Cannot construct Service instances directly");
        }
  
        if (this.reply === undefined) {
            throw new TypeError("Must override reply");
        }

        this.topic = topic;
        this.serviceReplyTranslator = new ServiceReplyTranslator();
    }
  
    prepareContext(){
        return {
            feedback: {
                title: '',
                message: '',
                stack: ''
            }
        }
    }
  }
  
module.exports = {
    'Service': Service,
}

