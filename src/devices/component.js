const { v4: uuidv4 } = require('uuid');
const { LoggingService } = require('@tum-far/ubii-node-nodejs');

const NotifyConditionManager = require('../conditions/notifyConditionManager');

const logger = LoggingService.instance.logger;

/**
 * Devices are representations of remote entities at the server that interact with the ubii system.
 */
class Component {
  static LOG_TAG = '[UBII Component]';

  constructor(specs) {
    specs && Object.assign(this, specs);
    this.id = uuidv4();
    this.topic = typeof this.topic === 'undefined' ? uuidv4() : this.topic;
    this.notifyConditionIds = typeof this.notifyConditionIds === 'undefined' ? [] : this.notifyConditionIds;

    this.conditions = [];
    for (const conditionId of this.notifyConditionIds) {
      const condition = NotifyConditionManager.instance.getNotifyCondition({ id: conditionId });
      if (condition) {
        this.conditions.push(condition);
      } else {
        logger.error({
          label: Component.LOG_TAG + ' ' + this.toString(),
          message: `could not find NotifyCondition with ID "${conditionId}"`
        });
      }
    }
  }

  hasNotifyConditions() {
    return this.conditions.length > 0;
  }

  attachNotifyCondition(id) {
    if (this.notifyConditionIds.some((existingId) => existingId === id)) {
      logger.warn({
        label: Component.LOG_TAG + ' ' + this.toString(),
        message: `NotifyCondition with ID "${id}" is already attached.`
      });
    }
    const condition = NotifyConditionManager.instance.getNotifyCondition({ id: id });
    if (condition) {
      this.conditions.push(condition);
      this.notifyConditionIds.push(condition.id);
    } else {
      logger.error({
        label: Component.LOG_TAG + ' ' + this.toString(),
        message: `could not find NotifyCondition with ID "${conditionId}"`
      });
    }
  }

  checkNotifyConditions(profilePublisher, profileSubscriber) {
    for (const condition of this.conditions) {
      let result = condition.evaluate(profilePublisher, profileSubscriber);
      if (!result) {
        return false;
      }
    }

    return true;
  }

  toProtobuf() {
    return {
      topic: this.topic,
      messageFormat: this.messageFormat,
      ioType: this.ioType,
      deviceId: this.deviceId,
      tags: this.tags,
      description: this.description,
      id: this.id,
      name: this.name,
      notifyConditionIds: this.notifyConditionIds
    };
  }

  toString() {
    return this.name + ' (' + this.id + ')';
  }
}

module.exports = Component;
