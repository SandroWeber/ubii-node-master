const { v4: uuidv4 } = require('uuid');
const { LoggingService } = require('@tum-far/ubii-node-nodejs');

const logger = LoggingService.instance.logger;

/**
 * Components are representations of data communication channels typically used to describe individual parts making up a device.
 */
class Component {
  static LOG_TAG = '[UBII Component]';

  constructor(specs, notifyConditionsManager) {
    specs && Object.assign(this, specs);
    this.id = uuidv4();
    this.topic = typeof this.topic === 'undefined' ? uuidv4() : this.topic;
    this.notifyConditionIds = typeof this.notifyConditionIds === 'undefined' ? [] : this.notifyConditionIds;

    this.notifyConditionsManager = notifyConditionsManager;

    this.conditions = [];
    for (const conditionId of this.notifyConditionIds) {
      const condition = this.notifyConditionsManager.getNotifyCondition({ id: conditionId });
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
    const condition = this.notifyConditionManager.getNotifyCondition({ id: id });
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
      id: this.id,
      name: this.name,
      description: this.description,
      tags: this.tags,
      deviceId: this.deviceId,
      clientId: this.clientId,
      topic: this.topic,
      messageFormat: this.messageFormat,
      ioType: this.ioType,
      notifyConditionIds: this.notifyConditionIds
    };
  }

  toString() {
    return this.name + ' (' + this.id + ')';
  }
}

module.exports = Component;
