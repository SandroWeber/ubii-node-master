import namida from '@tum-far/namida';
const { v4: uuidv4 } = require('uuid');

import { DeviceManager } from '../devices/deviceManager';
import FilterUtils from '../utils/filterUtils';
import Utils from '../utils/utilities';

const LOG_TAG = 'NotifyCondition';

class NotifyCondition {
  constructor(specs, topicDataBuffer) {
    this.specs = specs;
    this.specs.id = uuidv4();
    this.topicDataBuffer = topicDataBuffer;

    this.evaluationFunction = Utils.createFunctionFromString(specs.evaluationFunctionStringified);
    this.pairsPubSub = new Map();
  }

  getTopicDataRecord(topicDataSource, clientProfile) {
    if (topicDataSource.type === 'topic') {
      return this.topicDataBuffer.pull(topicDataSource[topicDataSource.type]);
    } else if (topicDataSource.type === 'component') {
      let components = [];
      if (clientProfile) {
        const devices = DeviceManager.instance.getDevicesByClientId(clientProfile.id);
        for (const device of devices) {
          components.push(device.components);
        }
        components = FilterUtils.filterAll(topicDataSource[topicDataSource.type], components);
      } else {
        components = DeviceManager.instance.getComponentsByProfile(topicDataSource[topicDataSource.type]);
      }

      if (components.length === 1) {
        return this.topicDataBuffer.pull(components[0].topic);
      } else {
        namida.logFailure(LOG_TAG, 'getTopicDataRecord() specified source as component, but multiple components match');
      }
    } else {
      namida.logFailure(
        LOG_TAG,
        'getTopicDataRecord() specified source "regex" is not viable, use getTopicDataRecords() instead'
      );
    }
  }

  evaluate(profilePublisher, profileSubscriber) {
    const key = [profilePublisher.id, profileSubscriber.id];
    if (!this.pairsPubSub.has(key)) {
      const valid =
        FilterUtils.matches(this.specs.clientProfilePub, profilePublisher) &&
        FilterUtils.matches(this.specs.clientProfileSub, profileSubscriber);
      this.pairsPubSub.set(key, { valid });
    }
    //TODO: implement performance improvements
    // keep track of valid pub/sub and other filter/eval results
    if (!this.pairsPubSub.get(key).valid) {
      return false;
    }

    return this.evaluationFunction.call(
      { getTopicDataRecords: this.getTopicDataRecords },
      profilePublisher,
      profileSubscriber
    );
  }

  toString() {
    return 'NotifyCondition "' +this.specs.name + '" (' + this.specs.id + ')';
  }

  toProtobuf() {
    return this.specs;
  }
}

module.exports = NotifyCondition;
