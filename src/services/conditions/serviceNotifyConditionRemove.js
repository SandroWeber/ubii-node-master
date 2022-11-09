const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const NotifyConditionManager = require('../conditions/NotifyConditionManager');

const LOG_TAG = 'ServiceNotifyConditionRemove';

class ServiceNotifyConditionRemove {
  constructor() {
    super(
      DEFAULT_TOPICS.SERVICES.NOTIFY_CONDITION_ADD,
      MSG_TYPES.NOTIFY_CONDITION,
      MSG_TYPES.SUCCESS + ', ' + MSG_TYPES.ERROR
    );
  }

  reply(spec) {
    try {
      if (NotifyConditionManager.instance.removeNotifyCondition(spec)) {
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
