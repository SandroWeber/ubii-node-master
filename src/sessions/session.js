const uuidv4 = require('uuid/v4');
const {Interaction} = require('@tum-far/ubii-interactions');

class Session {
  constructor({id = uuidv4(), name = '', interactions = [], ioMappings = []}, topicData) {
    this.id = id;
    this.name = name;
    this.status = Session.STATUS.CREATED;
    this.processMode = Session.PROCESS_MODES.PROMISE_RECURSIVECALLS;
    this.isProcessing = false;
    this.interactions = [];
    interactions.forEach((interactionSpecs) => {
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
      this.processInteractionsPromiseRecursive()
        .then(
          (resolved) => {console.info(resolved);},
          (rejected) => {console.info(rejected);}
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

    let recursiveisProcessingCall = (i) => {
      if (!this.isProcessing) return;

      let interaction = this.interactions[i % this.interactions.length];
      if (interaction) {
        interaction.process();
      }
      setTimeout(() => {recursiveisProcessingCall(i+1);}, 0);
    };

    return new Promise((resolve, reject) => {
      try {
        recursiveisProcessingCall(0);
      }
      catch (error) {
        reject(error);
      }

      resolve('processInteractionsPromiseRecursive() resolved');
    });
  }

  addInteraction(interaction) {
    if (!this.interactions.some((element) => {return element.id === interaction.id;})) {
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
    this.ioMappings.forEach((mapping) => {
      let interaction = this.interactions.find((interaction) => {
        return interaction.id === mapping.interactionId;
      });

      if (!interaction) {
        console.info('Session.applyIOMappings() - no interaction with ID ' + mapping.interactionId);
        return;
      }

      if (mapping.interactionInput && interaction.hasInput(mapping.interactionInput.internalName)) {
        if (!interaction.connectInput(mapping.interactionInput.internalName, mapping.topic)) {
          console.info('Session.applyIOMappings() - connectInput() failed for interaction ' + interaction.id +
            ': ' + mapping.interactionInput.internalName + ' -> ' + mapping.topic);
        }
      } else if (mapping.interactionOutput && interaction.hasOutput(mapping.interactionOutput.internalName)) {
        if (!interaction.connectOutput(mapping.interactionOutput.internalName, mapping.topic)) {
          console.info('Session.applyIOMappings() - connectOutput() failed for interaction ' + interaction.id +
            ': ' + mapping.interactionOutput.internalName + ' -> ' + mapping.topic);
        }
      }
    });
  }

  toProtobuf() {
    let protobufInteractions = this.interactions.map((interaction) => {
      return interaction.toProtobuf();
    });
    return {
      id: this.id,
      name: this.name,
      interactions: protobufInteractions,
      ioMappings: this.ioMappings
    }
  }
}

Session.PROCESS_MODES = Object.freeze({'PROMISE_RECURSIVECALLS': 1/*, 'SINGLE_THREAD':1, 'THREAD_POOL':2, 'INDIVIDUAL_THREADS':3*/});
Session.STATUS = Object.freeze({'CREATED': 1, 'STARTED': 2, 'RUNNING': 3, 'PAUSED': 4, 'STOPPED': 5});

module.exports = {Session};