const uuidv4 = require('uuid/v4');

class TopicMultiplexer {
  constructor({id = undefined, name = '', topicSelector = ''}) {

    this.id = id ? id : uuidv4();
    this.name = name;
    this.topicSelector = topicSelector;
  }

  toProtobuf() {
    return {};
  }
}

module.exports = {
  'TopicMultiplexer': TopicMultiplexer
}