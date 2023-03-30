const namida = require('@tum-far/namida');
const { v4: uuidv4 } = require('uuid');

const FilterUtils = require('../utils/filterUtils');
const Utils = require('../utils/utilities');

const LOG_TAG = 'NotifyCondition';

let gobalTopicDataBuffer = undefined;
let globalDeviceManager = undefined;
let getTopicDataRecord = (topicDataSource, clientProfile) => {
  if (!topicDataSource) {
    namida.logFailure(
      LOG_TAG,
      'getTopicDataRecord() has no TopicDataSource specified!'
    );
    return;
  }

  if (topicDataSource.type === 'topic' || topicDataSource.topic) {
    let record = gobalTopicDataBuffer.pull(topicDataSource.topic);
    return record;
  } else if (topicDataSource.type === 'component' || topicDataSource.component) {
    let matchingComponents = [];
    if (clientProfile) {
      const devices = globalDeviceManager.getDevicesByClientId(clientProfile.id).map(device => device.toProtobuf());
      for (const device of devices) {
        matchingComponents.push(...device.components);
      }
      matchingComponents = FilterUtils.filterAll([topicDataSource.component], matchingComponents);
    } else {
      matchingComponents = globalDeviceManager.getComponentsByProfile(topicDataSource.component);
    }

    if (matchingComponents.length === 1) {
      return gobalTopicDataBuffer.pull(matchingComponents[0].topic);
    } else {
      namida.logFailure(LOG_TAG, 'getTopicDataRecord() specified source as component, but multiple components match');
      console.info('requested profile:');
      console.info(topicDataSource.component);
      console.info('matching profiles:');
      console.info(matchingComponents);
    }
  } else {
    namida.logFailure(
      LOG_TAG,
      'getTopicDataRecord() specified source is not viable:'
    );
    console.info(topicDataSource);
  }
};

class NotifyCondition {
  get id() {
    return this.specs.id;
  }

  constructor(specs, topicDataBuffer, deviceManager) {
    this.specs = specs;
    this.specs.id = uuidv4();
    this.topicDataBuffer = topicDataBuffer;
    this.deviceManager = deviceManager;
    
    this.pairsPubSub = new Map();

    gobalTopicDataBuffer = topicDataBuffer;
    globalDeviceManager = deviceManager;

    this.evaluationFunction = Utils.createFunctionFromString(specs.evaluationFunctionStringified);
  }

  getTopicDataRecordList() {
    console.error('not implemented');
  }

  evaluate(profilePublisher, profileSubscriber) {
    const key = profilePublisher.id + '==' + profileSubscriber.id;
    if (!this.pairsPubSub.has(key)) {
      const validPublisher =
        !this.specs.clientProfilePub || FilterUtils.matches(this.specs.clientProfilePub, profilePublisher);
      const validSubscriber =
        !this.specs.clientProfileSub || FilterUtils.matches(this.specs.clientProfileSub, profileSubscriber);
      this.pairsPubSub.set(key, { valid: validPublisher && validSubscriber });
    }
    //TODO: implement performance improvements
    // keep track of valid pub/sub and other filter/eval results
    if (!this.pairsPubSub.get(key).valid) {
      return false;
    }

    return this.evaluationFunction(profilePublisher, profileSubscriber, getTopicDataRecord);
  }

  toString() {
    return 'NotifyCondition "' + this.specs.name + '" (' + this.specs.id + ')';
  }

  toProtobuf() {
    return this.specs;
  }
}

module.exports = NotifyCondition;
