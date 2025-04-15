const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const LOG_TAG = 'ServiceNotifyConditionRemove';

class ServiceNotifyConditionRemove {
  constructor(notifyConditionsManager) {
    super(
      DEFAULT_TOPICS.SERVICES.NOTIFY_CONDITION_REMOVE,
      MSG_TYPES.NOTIFY_CONDITION,
      MSG_TYPES.SUCCESS + ', ' + MSG_TYPES.ERROR
    );

    this.notifyConditionsManager = notifyConditionsManager;
  }

  reply(spec) {
    try {
      if (this.notifyConditionsManager.removeNotifyCondition(spec)) {
        return {
          success: {
            title: LOG_TAG,
            message: 'successfully removed notify condition "' + spec.name + '" (' + spec.id + ')'
          }
        };
      } else {
        return {
          error: {
            title: LOG_TAG,
            message: 'could not find notify condition "' + spec.name + '" (' + spec.id + ')'
          }
        };
      }
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

module.exports = ServiceNotifyConditionRemove;
