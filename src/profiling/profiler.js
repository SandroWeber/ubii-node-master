const { performance } = require('perf_hooks');

const { ConfigService } = require('@tum-far/ubii-node-nodejs');
const { proto } = require('@tum-far/ubii-msg-formats');
const namida = require('@tum-far/namida');

const { ClientManager } = require('../clients/clientManager');

const LOG_TAG = 'Profiler';

const average = (array) => array.reduce((a, b) => a + b) / array.length;

class Profiler {
  constructor(node, connectionsManager) {
    this.node = node;
    this.connectionsManager = connectionsManager;

    this.profilingConfig = ConfigService.instance.config.profiling;

    this.tStartup = Date.now();

    this.topicStatsMsgsPerSecondReceived = this.node.id + '/stats/msgs_per_second_received';
    this.topicStatsMsgsPerSecondSent = this.node.id + '/stats/msgs_per_second_sent';

    this.msIntervalProduceStats = 5000;
    this.intervalProduceStats = setInterval(() => this.produceStatistics(), this.msIntervalProduceStats);

    this.topicdataReceivedPrevious = 0;
    this.topicdataSentPrevious = 0;

    /*this.listMsgsReceivedPerTick = [];
    this.listMsgsSentPerTick = [];*/
    this.totalAvgMsgsRecv = 0;
    this.totalAvgMsgsSent = 0;

    namida.warn(LOG_TAG, 'ENABLED');
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
      this.node.publishRecord(recordMsgsPerSecRecv);
      let recordMsgsPerSecSent = {
        topic: this.topicStatsMsgsPerSecondReceived,
        double: diffTopicDataSent / durationSeconds
      };
      this.node.publishRecord(recordMsgsPerSecSent);

      this.topicdataReceivedPrevious = topicdataReceivedCurrent;
      this.topicdataSentPrevious = topicdataSentCurrent;

      /*this.listMsgsReceivedPerTick.push(recordMsgsPerSecondReceived.double);
      this.listMsgsSentPerTick.push(recordMsgsPerSecondSent.double);
      let avgMsgsRecvTotal = average(this.listMsgsReceivedPerTick);
      let avgMsgsSentTotal = average(this.listMsgsSentPerTick);*/
      this.totalAvgMsgsRecv = (this.totalAvgMsgsRecv + recordMsgsPerSecRecv.double) / 2;
      this.totalAvgMsgsSent = (this.totalAvgMsgsSent + recordMsgsPerSecSent.double) / 2;

      if (this.profilingConfig.consoleOutput) {
        namida.log(
          LOG_TAG,
          `msgs/s recv|sent - ${Math.round(recordMsgsPerSecRecv.double)}|${Math.round(
            recordMsgsPerSecSent.double
          )} (last 5s) - ${Math.round(this.totalAvgMsgsRecv)}|${Math.round(this.totalAvgMsgsSent)} (rolling sum)` +
            ' ; ' +
            'active clients: ' +
            ClientManager.instance
              .getClientList()
              .filter((client) => client.state === proto.ubii.clients.Client.State.ACTIVE).length
        );
      }
    }

    let tNow = performance.now();
    let delayFactor = (tNow - this.tLastStats) / this.msIntervalProduceStats;
    if (this.tLastStats && delayFactor > 1.1) {
      namida.warn(
        LOG_TAG,
        'target delay between statistics recording exceeded by a factor of ' +
          delayFactor +
          ', overall performance is probably affected!'
      );
    }
    this.tLastStats = performance.now();
  }
}

module.exports = { Profiler };
