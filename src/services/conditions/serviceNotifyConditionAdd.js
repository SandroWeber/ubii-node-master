const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../service.js');

const LOG_TAG = 'ServiceNotifyConditionAdd';

class ServiceNotifyConditionAdd extends Service {
  constructor(notifyConditionManager) {
    super(
      DEFAULT_TOPICS.SERVICES.NOTIFY_CONDITION_ADD,
      MSG_TYPES.NOTIFY_CONDITION,
      MSG_TYPES.NOTIFY_CONDITION + ', ' + MSG_TYPES.ERROR
    );

    this.notifyConditionManager = notifyConditionManager;
  }

  reply(notifyConditionSpec) {
    try {
      let condition = this.notifyConditionManager.createNotifyCondition(notifyConditionSpec);
      return {
        notifyCondition: condition.toProtobuf()
      };
    } catch (error) {
      console.error(error);
      return {
        error: {
          title: LOG_TAG,
          message: error.toString(),
          stack: error.stack
        }
      };
    }
  }
}

module.exports = ServiceNotifyConditionAdd;
