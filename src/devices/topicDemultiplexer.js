const { v4: uuidv4 } = require('uuid');
const printf = require('printf');

/**
 * Used to publish a list of data to topics that adhere to a certain format.
 * 
 * `outputTopicFormat` is used to specify the topic for each list entry. Use printf format: "/publish/to/%s/this/topic/%s", where the parameters are
 * provided in an array `outputTopicParams` for each list entry when calling push()
 */
class TopicDemultiplexer {
  constructor({ id = undefined, name = '', dataType = '', outputTopicFormat = '' }, topicData = undefined) {

    this.id = id ? id : uuidv4();
    this.name = name;
    this.dataType = dataType;
    this.outputTopicFormat = outputTopicFormat;

    this.topicData = topicData;
  }

  /**
   * Publish a list of entries: [{data : data to publish, outputTopicParams: array of string params used to format outputTopicFormat}, ...]
   * 
   * `outputTopicFormat` uses printf format to generate output topic: 
   * `outputTopicFormat` = '/publish/to/%s/this/topic/%s'
   * `outputTopicParams` = ['paramter1', 'parameter2']
   * results in
   * `outputTopic` = /publish/to/paramter1/this/topic/parameter2
   */
  push(topicDataList) {
    topicDataList.forEach((entry) => {
      try {
        let outputTopic = printf(this.outputTopicFormat, ...entry.outputTopicParams);
        this.topicData.publish(outputTopic, entry.data, this.dataType);
      } catch (error) {
        throw error;
      }
    });
  }

  toProtobuf() {
    return {
      id: this.id,
      name: this.name,
      dataType: this.dataType,
      outputTopicFormat: this.outputTopicFormat
    };
  }
}

module.exports = {
  'TopicDemultiplexer': TopicDemultiplexer
}