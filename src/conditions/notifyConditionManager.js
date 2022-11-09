const namida = require("@tum-far/namida");

const LOG_TAG = 'NotifyConditionManager';

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
  
    setDependencies(topicDataBuffer) {
      this.topicDataBuffer = topicDataBuffer;
    }

    createNotifyCondition(specs) {
        let condition = new NotifyCondition(specs, this.topicDataBuffer);
        this.notifyConditions.set(condition.id, condition);

        return condition;
    }

    removeNotifyCondition(specs) {
      return this.notifyConditions.delete(specs.id);
    }

    getNotifyCondition(specs) {
        if (!specs.id) {
            namida.logFailure(LOG_TAG, 'getNotifyCondition() - can only filter by "id" currently, please provide one');
            return;
        }

        return this.notifyConditions.get(specs.id);
    }
}

module.exports = NotifyConditionManager;