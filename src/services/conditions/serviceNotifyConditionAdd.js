const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const NotifyConditionManager = require('../conditions/NotifyConditionManager');


const LOG_TAG = 'ServiceNotifyConditionAdd';

class ServiceNotifyConditionAdd {
  constructor() {
    super(
      DEFAULT_TOPICS.SERVICES.NOTIFY_CONDITION_ADD,
      MSG_TYPES.NOTIFY_CONDITION,
      MSG_TYPES.NOTIFY_CONDITION + ', ' + MSG_TYPES.ERROR
    );
  }

  reply(notifyConditionSpec) {
    try {
      let condition = NotifyConditionManager.instance.createNotifyCondition(notifyConditionSpec);
      return condition.toProtobuf();
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
