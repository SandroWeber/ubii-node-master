const namida = require('@tum-far/namida');
const { v4: uuidv4 } = require('uuid');

const FilterUtils = require('../utils/filterUtils');
const Utils = require('../utils/utilities');

const LOG_TAG = 'NotifyCondition';

//let getTopicDataRecord = undefined;
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
  /*console.info('getTopicDataRecord() - topicDataSource, clientProfile:');
  console.info(topicDataSource);
  console.info(clientProfile);*/

  if (topicDataSource.type === 'topic' || topicDataSource.topic) {
    let record = gobalTopicDataBuffer.pull(topicDataSource.topic);
    //console.info(record);
    return record;
  } else if (topicDataSource.type === 'component' || topicDataSource.component) {
    let components = [];
    if (clientProfile) {
      const devices = globalDeviceManager.getDevicesByClientId(clientProfile.id);
      for (const device of devices) {
        components.push(device.components);
      }
      components = FilterUtils.filterAll(topicDataSource.component, components);
    } else {
      components = globalDeviceManager.getComponentsByProfile(topicDataSource.component);
    }

    if (components.length === 1) {
      return gobalTopicDataBuffer.pull(components[0].topic);
    } else {
      namida.logFailure(LOG_TAG, 'getTopicDataRecord() specified source as component, but multiple components match');
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

    //getTopicDataRecord = this.getTopicDataRecord;
    gobalTopicDataBuffer = topicDataBuffer;
    globalDeviceManager = deviceManager;
    /*console.info(gobalTopicDataBuffer);
    console.info(globalDeviceManager);
    console.info(getTopicDataRecord);
    console.info(getTopicDataRecord());*/

    this.evaluationFunction = Utils.createFunctionFromString(specs.evaluationFunctionStringified);
    //this.evaluationFunction = new Function('return ' + specs.evaluationFunctionStringified);
    /*console.info(specs.evaluationFunctionStringified);
    console.info(this.evaluationFunction);*/
  }

  /*getTopicDataRecord(topicDataSource, clientProfile) {
    if (topicDataSource.type === 'topic') {
      return this.topicDataBuffer.pull(topicDataSource[topicDataSource.type]);
    } else if (topicDataSource.type === 'component') {
      let components = [];
      if (clientProfile) {
        const devices = this.deviceManager.getDevicesByClientId(clientProfile.id);
        for (const device of devices) {
          components.push(device.components);
        }
        components = FilterUtils.filterAll(topicDataSource[topicDataSource.type], components);
      } else {
        components = this.deviceManager.getComponentsByProfile(topicDataSource[topicDataSource.type]);
      }

      if (components.length === 1) {
        return this.topicDataBuffer.pull(components[0].topic);
      } else {
        namida.logFailure(LOG_TAG, 'getTopicDataRecord() specified source as component, but multiple components match');
      }
    } else {
      namida.logFailure(
        LOG_TAG,
        'getTopicDataRecord() specified source "regex" is not viable, use getTopicDataRecordList() instead'
      );
    }
  }*/

  getTopicDataRecordList() {
    console.error('not implemented');
  }

  evaluate(profilePublisher, profileSubscriber) {
    //console.info('\nevaluate() - ' + this.toString());
    //console.info(getTopicDataRecord);
    const key = profilePublisher.id + '==' + profileSubscriber.id;
    if (!this.pairsPubSub.has(key)) {
      const validPublisher =
        !this.specs.clientProfilePub || FilterUtils.matches(this.specs.clientProfilePub, profilePublisher);
      const validSubscriber =
        !this.specs.clientProfileSub || FilterUtils.matches(this.specs.clientProfileSub, profilePublisher);
      this.pairsPubSub.set(key, { valid: validPublisher && validSubscriber });
      //console.info(this.toString() + ' - pub/sub pair ' + key + ' set to ' + this.pairsPubSub.get(key).valid);
    }
    //TODO: implement performance improvements
    // keep track of valid pub/sub and other filter/eval results
    if (!this.pairsPubSub.get(key).valid) {
      return false;
    }

    /*return this.evaluationFunction.call(
      { getTopicDataRecord: getTopicDataRecord },
      profilePublisher,
      profileSubscriber
    );*/
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
