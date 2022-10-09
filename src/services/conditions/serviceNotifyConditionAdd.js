const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');

class ServiceNotifyConditionAdd {
  constructor() {
    super(
      DEFAULT_TOPICS.SERVICES.NOTIFY_CONDITION_ADD,
      MSG_TYPES.NOTIFY_CONDITION,
      MSG_TYPES.NOTIFY_CONDITION + ', ' + MSG_TYPES.ERROR
    );
  }

  reply(request) {
    
  }
}

module.exports = ServiceNotifyConditionAdd;
