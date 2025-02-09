const { LoggingService } = require('@tum-far/ubii-node-nodejs/src/index.js');

const NotifyCondition = require('./notifyCondition.js');
const MASTER_NODE_CONSTANTS = require('../node/constants');

const logger = LoggingService.instance.logger;
const LOG_TAG = '[UBII NotifyConditionManager]';

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
    logger.info({ label: LOG_TAG, message: 'new ' + condition.toString() });

    return condition;
  }

  removeNotifyCondition(specs) {
    return this.notifyConditions.delete(specs.id);
  }

  getNotifyCondition(specs) {
    if (!specs.id) {
      logger.error({
        label: LOG_TAG,
        message: 'getNotifyCondition() - can only filter by "id" currently, please provide one'
      });
      return;
    }

    return this.notifyConditions.get(specs.id);
  }
}

module.exports = NotifyConditionManager;
