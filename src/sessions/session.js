const uuidv4 = require('uuid/v4');
const { Interaction } = require('./interaction');

class Session {
  constructor({ id, name = '', interactions = [], ioMappings = [] }, topicData, deviceManager) {
    this.id = id ? id : uuidv4();
    this.name = name;
    this.status = Session.STATUS.CREATED;
    this.processMode = Session.PROCESS_MODES.PROMISE_RECURSIVECALLS;
    this.isProcessing = false;
    this.interactions = interactions;
    this.ioMappings = ioMappings;

    this.topicData = topicData;
    this.deviceManager = deviceManager;

    this.runtimeInteractions = [];
  }

  start() {
    if (this.isProcessing) {
      return;
    }

    this.interactions.forEach(interactionSpecs => {
      this.addInteraction(interactionSpecs);
    });

    this.applyIOMappings();

    this.status = Session.STATUS.STARTED;
    if (this.processMode === Session.PROCESS_MODES.PROMISE_RECURSIVECALLS) {
      this.processInteractionsPromiseRecursive().then(
        () => { },
        rejected => {
          console.info(rejected);
        }
      );
    }
  }

  stop() {
    this.isProcessing = false;
    this.status = Session.STATUS.STOPPED;
  }

  processInteractionsPromiseRecursive() {
    this.isProcessing = true;
    this.status = Session.STATUS.RUNNING;

    let recursiveisProcessingCall = i => {
      if (!this.isProcessing) return;

      let interaction = this.runtimeInteractions[i % this.runtimeInteractions.length];
      if (interaction) {
        interaction.process();
      }
      setTimeout(() => {
        recursiveisProcessingCall(i + 1);
      }, 0);
    };

    return new Promise((resolve, reject) => {
      try {
        recursiveisProcessingCall(0);
      } catch (error) {
        reject(error);
      }

      resolve('processInteractionsPromiseRecursive() resolved');
    });
  }

  addInteraction(specs) {
    if (
      !this.runtimeInteractions.some(interaction => {
        return interaction.id === specs.id;
      })
    ) {
      let interaction = new Interaction(specs);
      interaction.setTopicData(this.topicData);
      interaction.onCreated();

      this.runtimeInteractions.push(interaction);

      return interaction;
    }
  }

  removeInteraction(interactionID) {
    this.runtimeInteractions.forEach((element, index) => {
      if (element.id === interactionID) {
        this.interactions.splice(index, 1);
      }
    });
  }

  applyIOMappings() {
    this.ioMappings.forEach(mapping => {
      let interaction = this.runtimeInteractions.find(interaction => {
        return interaction.id === mapping.interactionId;
      });

      if (!interaction) {
        console.info('Session.applyIOMappings() - no interaction with ID ' + mapping.interactionId);
        return;
      }

      mapping.inputMappings && mapping.inputMappings.forEach(inputMapping => {
        // single topic input target
        if (typeof inputMapping.topicSource === 'string') {
          if (interaction.hasInput(inputMapping.name)) {
            if (!interaction.connectInputTopic(inputMapping.name, inputMapping.topicSource)) {
              console.info(
                'Session.applyIOMappings() - connectInput() failed for interaction ' +
                interaction.id +
                ': ' +
                inputMapping.name +
                ' -> ' +
                inputMapping.topicSource
              );
            }
          }
        }
        // topic mux
        else if (typeof inputMapping.topicSource === 'object') {
          let mux = this.deviceManager.addTopicMux(inputMapping.topicSource);
          interaction.connectMultiplexer(inputMapping.name, mux)
        }
      });

      mapping.outputMappings && mapping.outputMappings.forEach(outputMapping => {
        // single topic output target
        if (typeof outputMapping.topicDestination === 'string') {
          if (interaction.hasOutput(outputMapping.name)) {
            if (!interaction.connectOutputTopic(outputMapping.name, outputMapping.topicDestination)) {
              console.info(
                'Session.applyIOMappings() - connectOutputTopic() failed for interaction ' +
                interaction.id +
                ': ' +
                outputMapping.name +
                ' -> ' +
                outputMapping.topicDestination
              );
            }
          }
        }
        // topic demux
        else if (typeof outputMapping.topicDestination === 'object') {
          let demux = this.deviceManager.addTopicDemux(outputMapping.topicDestination);
          interaction.connectDemultiplexer(outputMapping.name, demux);
        }
      });
    });
  }

  toProtobuf() {
    return {
      id: this.id,
      name: this.name,
      interactions: this.interactions,
      ioMappings: this.ioMappings
    };
  }
}

Session.PROCESS_MODES = Object.freeze({
  PROMISE_RECURSIVECALLS: 1 /*, 'SINGLE_THREAD':1, 'THREAD_POOL':2, 'INDIVIDUAL_THREADS':3*/
});
Session.STATUS = Object.freeze({
  CREATED: 1,
  STARTED: 2,
  RUNNING: 3,
  PAUSED: 4,
  STOPPED: 5
});

module.exports = { Session };
