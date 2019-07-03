const uuidv4 = require('uuid/v4');
const { Interaction } = require('./interaction');

class Session {
  constructor({ id, name = '', interactions = [], ioMappings = [] }, topicData) {
    this.id = id ? id : uuidv4();
    this.name = name;
    this.status = Session.STATUS.CREATED;
    this.processMode = Session.PROCESS_MODES.PROMISE_RECURSIVECALLS;
    this.isProcessing = false;
    this.interactions = [];
    interactions.forEach(interactionSpecs => {
      let interaction = new Interaction(interactionSpecs);
      interaction.setTopicData(topicData);
      this.addInteraction(interaction);
    });
    this.ioMappings = ioMappings;

    this.topicData = topicData;
  }

  start() {
    if (this.isProcessing) {
      return;
    }

    this.applyIOMappings();

    this.status = Session.STATUS.STARTED;
    if (this.processMode === Session.PROCESS_MODES.PROMISE_RECURSIVECALLS) {
      this.processInteractionsPromiseRecursive().then(
        () => {},
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

      let interaction = this.interactions[i % this.interactions.length];
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

  addInteraction(interaction) {
    if (
      !this.interactions.some(element => {
        return element.id === interaction.id;
      })
    ) {
      this.interactions.push(interaction);
    }
  }

  removeInteraction(interactionID) {
    this.interactions.forEach((element, index) => {
      if (element.id === interactionID) {
        this.interactions.splice(index, 1);
      }
    });
  }

  applyIOMappings() {
    this.ioMappings.forEach(mapping => {
      let interaction = this.interactions.find(interaction => {
        return interaction.id === mapping.interactionId;
      });

      if (!interaction) {
        console.info('Session.applyIOMappings() - no interaction with ID ' + mapping.interactionId);
        return;
      }

      mapping.inputMappings.forEach(inputMapping => {
        // single topic input target
        if (typeof inputMapping.topicSource === 'string') {
          if (interaction.hasInput(inputMapping.name)) {
            if (!interaction.connectInput(inputMapping.name, inputMapping.topicSource)) {
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
          //TODO
        }
      });

      mapping.outputMappings.forEach(outputMapping => {
        // single topic output target
        if (typeof outputMapping.topicDestination === 'string') {
          if (interaction.hasOutput(outputMapping.name)) {
            //TODO: still looks a bit "hacky", maybe include type info in protobuf
            /*let formatArray = mapping.interactionOutput.messageFormat.split(
              '.'
            );
            let type = formatArray[formatArray.length - 1]; // remove namespacing
            type = type.charAt(0).toLowerCase() + type.slice(1); // make first letter lowercase*/

            if (!interaction.connectOutput(outputMapping.name, outputMapping.topicDestination)) {
              console.info(
                'Session.applyIOMappings() - connectOutput() failed for interaction ' +
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
        else if (typeof inputMapping.topicSource === 'object') {
          //TODO
        }
      });
    });
  }

  toProtobuf() {
    let protobufInteractions = this.interactions.map(interaction => {
      return interaction.toProtobuf();
    });
    return {
      id: this.id,
      name: this.name,
      interactions: protobufInteractions,
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
