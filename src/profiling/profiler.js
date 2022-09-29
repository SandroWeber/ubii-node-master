const { ConfigService } = require('@tum-far/ubii-node-nodejs');
const namida = require('@tum-far/namida');

class Profiler {
  constructor(node, connectionsManager) {
    this.node = node;
    this.connectionsManager = connectionsManager;

    this.profilingConfig = ConfigService.instance.config.profiling;

    this.topicStatsMsgsPerSecondReceived = this.node.id + '/stats/msgs_per_second_received';
    this.topicStatsMsgsPerSecondSent = this.node.id + '/stats/msgs_per_second_sent';

    this.msIntervalProduceStats = 5000;
    this.intervalProduceStats = setInterval(() => this.produceStatistics(), this.msIntervalProduceStats);

    namida.warn('Profiler', 'ENABLED');
  }

  produceStatistics() {
    let durationSeconds = this.msIntervalProduceStats / 1000;
    if (this.connectionsManager) {
      let recordMsgsPerSecondReceived = {
        topic: this.topicStatsMsgsPerSecondSent,
        double: this.connectionsManager.statistics.counterTopicDataReceived / durationSeconds
      };
      this.node.publishRecord(recordMsgsPerSecondReceived);

      let recordMsgsPerSecondSent = {
        topic: this.topicStatsMsgsPerSecondReceived,
        double: this.connectionsManager.statistics.counterTopicDataSent / durationSeconds
      };
      this.node.publishRecord(recordMsgsPerSecondSent);

      this.connectionsManager.statistics.counterTopicDataReceived = 0;
      this.connectionsManager.statistics.counterTopicDataSent = 0;

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
