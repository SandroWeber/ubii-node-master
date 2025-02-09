const { performance } = require('perf_hooks');

const { ConfigService, LoggingService } = require('@tum-far/ubii-node-nodejs');
const { proto } = require('@tum-far/ubii-msg-formats');

const { ClientManager } = require('../clients/clientManager');

const logger = LoggingService.instance.logger;
const LOG_TAG = '[UBII Profiler]';
const STAT_INTERVAL_MS_DEFAULT = 5000;

//const average = (array) => array.reduce((a, b) => a + b) / array.length;

class Profiler {
  constructor(node, connectionsManager) {
    this.node = node;
    this.connectionsManager = connectionsManager;

    this.profilingConfig = ConfigService.instance.config.profiling;

    this.tStartup = Date.now();

    this.topicStatsMsgsPerSecondReceived = this.node.id + '/stats/msgs_per_second_received';
    this.topicStatsMsgsPerSecondSent = this.node.id + '/stats/msgs_per_second_sent';

    this.msIntervalProduceStats = STAT_INTERVAL_MS_DEFAULT;
    this.intervalProduceStats = setInterval(() => this.produceStatistics(), this.msIntervalProduceStats);

    this.topicdataReceivedPrevious = 0;
    this.topicdataSentPrevious = 0;

    /*this.listMsgsReceivedPerTick = [];
    this.listMsgsSentPerTick = [];*/
    this.totalAvgMsgsRecv = 0;
    this.totalAvgMsgsSent = 0;

    logger.warn({ label: LOG_TAG, message: 'ENABLED' });
  }

  produceStatistics() {
    let durationSeconds = this.msIntervalProduceStats / 1000;
    if (this.connectionsManager) {
      let topicdataReceivedCurrent = this.connectionsManager.statistics.counterTopicDataReceived;
      let topicdataSentCurrent = this.connectionsManager.statistics.counterTopicDataSent;

      let diffTopicDataReceived = topicdataReceivedCurrent - this.topicdataReceivedPrevious;
      let diffTopicDataSent = topicdataSentCurrent - this.topicdataSentPrevious;

      let recordMsgsPerSecRecv = {
        topic: this.topicStatsMsgsPerSecondSent,
        double: diffTopicDataReceived / durationSeconds
      };
      this.node.publishRecord(recordMsgsPerSecRecv, this.node.id);
      let recordMsgsPerSecSent = {
        topic: this.topicStatsMsgsPerSecondReceived,
        double: diffTopicDataSent / durationSeconds
      };
      this.node.publishRecord(recordMsgsPerSecSent, this.node.id);

      this.topicdataReceivedPrevious = topicdataReceivedCurrent;
      this.topicdataSentPrevious = topicdataSentCurrent;

      /*this.listMsgsReceivedPerTick.push(recordMsgsPerSecondReceived.double);
      this.listMsgsSentPerTick.push(recordMsgsPerSecondSent.double);
      let avgMsgsRecvTotal = average(this.listMsgsReceivedPerTick);
      let avgMsgsSentTotal = average(this.listMsgsSentPerTick);*/
      this.totalAvgMsgsRecv = (this.totalAvgMsgsRecv + recordMsgsPerSecRecv.double) / 2;
      this.totalAvgMsgsSent = (this.totalAvgMsgsSent + recordMsgsPerSecSent.double) / 2;

      if (this.profilingConfig.consoleOutput) {
        logger.info({
          label: LOG_TAG,
          message:
            `msgs/s recv|sent - ${Math.round(recordMsgsPerSecRecv.double)}|${Math.round(
              recordMsgsPerSecSent.double
            )} (last ${this.msIntervalProduceStats / 1000}s) - ${Math.round(this.totalAvgMsgsRecv)}|${Math.round(
              this.totalAvgMsgsSent
            )} (rolling sum)` +
            ' ; ' +
            'active clients: ' +
            ClientManager.instance
              .getClientList()
              .filter((client) => client.state === proto.ubii.clients.Client.State.ACTIVE).length
        });
      }
    }

    let tNow = performance.now();
    let delayFactor = (tNow - this.tLastStats) / this.msIntervalProduceStats;
    if (this.tLastStats && delayFactor > 1.1) {
      logger.info({
        label: LOG_TAG,
        message:
          'target delay between statistics recording exceeded by a factor of ' +
          delayFactor +
          ', overall performance is probably affected!'
      });
    }
    this.tLastStats = performance.now();
  }
}

module.exports = { Profiler };
