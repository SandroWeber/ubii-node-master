const { ConfigService } = require('@tum-far/ubii-node-nodejs');
const namida = require('@tum-far/namida');

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

    namida.warn('Profiler', 'ENABLED');
  }

  produceStatistics() {
    let durationSeconds = this.msIntervalProduceStats / 1000;
    if (this.connectionsManager) {
      let topicdataReceivedCurrent = this.connectionsManager.statistics.counterTopicDataReceived;
      let topicdataSentCurrent = this.connectionsManager.statistics.counterTopicDataSent;

      let diffTopicDataReceived = topicdataReceivedCurrent - this.topicdataReceivedPrevious;
      let diffTopicDataSent = topicdataSentCurrent - this.topicdataSentPrevious;

      let recordMsgsPerSecondReceived = {
        topic: this.topicStatsMsgsPerSecondSent,
        double: diffTopicDataReceived / durationSeconds
      };
      this.node.publishRecord(recordMsgsPerSecondReceived);
      let recordMsgsPerSecondSent = {
        topic: this.topicStatsMsgsPerSecondReceived,
        double: diffTopicDataSent / durationSeconds
      };
      this.node.publishRecord(recordMsgsPerSecondSent);

      this.topicdataReceivedPrevious = topicdataReceivedCurrent;
      this.topicdataSentPrevious = topicdataSentCurrent;

      if (this.profilingConfig.consoleOutput) {
        namida.log(
          'Profiler',
          'msgs/s received|sent: ' + recordMsgsPerSecondReceived.double + '|' + recordMsgsPerSecondSent.double
        );
      }
    }
  }
}

module.exports = { Profiler };
