const { v4: uuidv4 } = require('uuid');
const { LoggingService } = require('@tum-far/ubii-node-nodejs');

const NotifyConditionManager = require('../conditions/notifyConditionManager');

const logger = LoggingService.instance.logger;

/**
 * Devices are representations of remote entities at the server that interact with the ubii system.
 */
class Component {
  constructor(specs) {
    specs && Object.assign(this, specs);
    this.id = uuidv4();
    this.topic = typeof this.topic === 'undefined' ? uuidv4() : this.topic;

    this.conditions = [];
    for (const conditionId of this.notifyConditionIds) {
      let condition = NotifyConditionManager.instance.getNotifyCondition({ id: conditionId });
      if (condition) {
        this.conditions.push(condition);
      } else {
        logger.error({ label: this.toString(), message: `could not find NotifyCondition with ID "${conditionId}"` });
      }
    }
  }

  hasNotifyConditions() {
    return this.conditions.length > 0;
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
    return '[UBII Component "' + this.name + '" (' + this.id + ')]';
  }
}

module.exports = Component;
