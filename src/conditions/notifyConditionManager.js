const namida = require('@tum-far/namida');

const NotifyCondition = require('./notifyCondition.js');
const MASTER_NODE_CONSTANTS = require('../node/constants');

const LOG_TAG = 'NotifyConditionManager';

let _instance = null;
const SINGLETON_ENFORCER = Symbol();

class NotifyConditionManager {
  constructor(enforcer) {
    if (enforcer !== SINGLETON_ENFORCER) {
      throw new Error('Use ' + this.constructor.name + '.instance');
    }

    this.notifyConditions = new Map();
  }

  static get instance() {
    if (_instance == null) {
      _instance = new NotifyConditionManager(SINGLETON_ENFORCER);
    }

    return _instance;
  }

  setUbiiNode(ubiiNode) {
    this.ubiiNode = ubiiNode;
    this.topicDataBuffer = this.ubiiNode.getDependency(MASTER_NODE_CONSTANTS.TOPIC_DATA_BUFFER);
    this.deviceManager = this.ubiiNode.getDependency(MASTER_NODE_CONSTANTS.MANAGERS.DEVICES);
  }

  createNotifyCondition(specs) {
    let condition = new NotifyCondition(specs, this.topicDataBuffer, this.deviceManager);
    this.notifyConditions.set(condition.id, condition);
    namida.logSuccess(LOG_TAG, 'new ' + condition.toString());

    return condition;
  }

  removeNotifyCondition(specs) {
    return this.notifyConditions.delete(specs.id);
  }

  getNotifyCondition(specs) {
    if (!specs.id) {
      namida.logFailure(LOG_TAG, 'getNotifyCondition() - can only filter by "id" currently, please provide one');
      return;
    }

    //console.info(this.notifyConditions);
    return this.notifyConditions.get(specs.id);
  }
}

module.exports = NotifyConditionManager;
