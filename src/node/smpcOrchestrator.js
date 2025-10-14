

class SmpcOrchestrator {
  constructor(networkManager, topicDataTranslator, topicDataBuffer, options = {}) {
    this.network = networkManager;
    this.topicDataTranslator = topicDataTranslator;
    this.topicDataBuffer = topicDataBuffer;
    this.options = Object.assign(
      {
        simulate: false,
        simulateDelay: 200,
        timeout: 10000,
        controlTopic: '/ubii/smpc/control',
        resultTopic: '/ubii/smpc/result'
      },
      options
    );
this.pending = new Map();

    if (this.topicDataBuffer && typeof this.topicDataBuffer.subscribeTopic === 'function') {
      this.resultToken = this.topicDataBuffer.subscribeTopic(this.options.resultTopic, (record, publisherId) =>
        this._onResult(record, publisherId)
      );
    }
  }

  _genSessionId() {
    return 'smpc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

 runProximityProtocol(params = {}) {
  const { publisherId, subscriberId } = params;
  const sessionId = this._genSessionId();

  const payload = {
    topic: this.options.controlTopic,
    string: JSON.stringify({
      type: 'SMPC_START_PROXIMITY',
      sessionId,
      publisherId,
      subscriberId
    })
  };

  try {
    this.topicDataBuffer.publish(this.options.controlTopic, payload);
    console.log(`[SmpcOrchestrator] Published SMPC_START_PROXIMITY to ${this.options.controlTopic}`);
  } catch (e) {
    console.error('[SmpcOrchestrator] publish failed:', e);
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      this.pending.delete(sessionId);
      reject(new Error('SMPC timeout for ' + sessionId));
    }, this.options.timeout);

    this.pending.set(sessionId, {
      resolve: (val) => {
        clearTimeout(timeout);
        resolve(!!val);
      },
      reject: (err) => {
        clearTimeout(timeout);
        reject(err);
      }
    });

    if (this.options.simulate) {
      setTimeout(() => {
        if (this.pending.has(sessionId)) {
          this.complete(sessionId, true, { simulated: true });
        }
      }, this.options.simulateDelay);
    }
  });
}



  _onResult(record) {
    try {
      if (!record) return;
      let data = null;
      if (record.string) {
        data = JSON.parse(record.string);
      } else if (record.json) {
        data = record.json;
      } else {
        try {
          data = JSON.parse(JSON.stringify(record));
        } catch (e) {
          console.warn('[SmpcOrchestrator] unknown record format', record);
          return;
        }
      }

      if (!data || !data.sessionId) {
        console.warn('[SmpcOrchestrator] result missing sessionId', data);
        return;
      }

      this.complete(data.sessionId, data.allowed, { fromClient: true, raw: data });
    } catch (e) {
      console.error('[SmpcOrchestrator] _onResult error', e);
    }
  }

  complete(sessionId, allowed, meta = {}) {
    const ent = this.pending.get(sessionId);
    if (!ent) {
      return false;
    }
    try {
      ent.resolve(!!allowed);
    } catch (e) {
      ent.reject(e);
    }
    this.pending.delete(sessionId);
    return true;
  }
}

module.exports = SmpcOrchestrator;
