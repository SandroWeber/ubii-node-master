const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

const { Service } = require('../service.js');
const NotifyConditionManager = require('../../conditions/notifyConditionManager');

const LOG_TAG = 'ServiceNotifyConditionAdd';

class ServiceNotifyConditionGetList extends Service {
  constructor() {
    super(
      DEFAULT_TOPICS.SERVICES.NOTIFY_CONDITION_GET_LIST,
      MSG_TYPES.NOTIFY_CONDITION,
      MSG_TYPES.NOTIFY_CONDITION + ', ' + MSG_TYPES.ERROR
    );
  }

  reply(notifyConditionSpec) {
    try {
      let condition = NotifyConditionManager.instance.createNotifyCondition(notifyConditionSpec);
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

module.exports = ServiceNotifyConditionGetList;
