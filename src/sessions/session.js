const uuidv4 = require('uuid/v4');

const InteractionIOMapping = require('./interactionIOMapping');

class Session {
  constructor(id, interactionIOMappings) {
    this.id = id ? id : uuidv4();
    this.status = Session.STATUS.CREATED;
    this.processMode = Session.PROCESS_MODES.PROMISE_RECURSIVECALLS;
    this.processing = false;

    this.interactionIOMappings = interactionIOMappings ? interactionIOMappings : [];
  }

  start() {
    if (this.processing) {
      return;
    }

    this.status = Session.STATUS.STARTED;
    if (this.processMode === Session.PROCESS_MODES.PROMISE_RECURSIVECALLS) {
      this.processInteractionsPromiseRecursive();
    }
  }

  stop() {
    this.processing = false;
    this.status = Session.STATUS.STOPPED;
  }

  processInteractionsPromiseRecursive() {
    this.processing = true;
    this.status = Session.STATUS.RUNNING;

    let recursiveProcessingCall = (i) => {
      if (!this.processing) return;

      let interaction = this.interactionIOMappings[i % this.interactionIOMappings.length].interaction;
      if (interaction) interaction.process();
      setTimeout(() => {recursiveProcessingCall(i+1);}, 0);
    };

    return new Promise((resolve, reject) => {
      try {
        recursiveProcessingCall(0);
      }
      catch (e) {
        reject(e);
      }

      resolve('processInteractionsPromiseRecursive() resolved');
    });
  }

  addInteraction(interaction) {
    if (!this.interactionIOMappings.some((element) => {return element.interaction.id === interaction.id;})) {
      this.interactionIOMappings.push(new InteractionIOMapping(uuidv4(), interaction));
    }
  }

  removeInteraction(interactionID) {
    this.interactionIOMappings.forEach((element, index) => {
      if (element.interaction.id === interactionID) {
        this.interactionIOMappings.splice(index, 1);
      }
    });
  }
}

Session.PROCESS_MODES = Object.freeze({'PROMISE_RECURSIVECALLS': 1/*, 'SINGLE_THREAD':1, 'THREAD_POOL':2, 'INDIVIDUAL_THREADS':3*/});
Session.STATUS = Object.freeze({'CREATED': 1, 'STARTED': 2, 'RUNNING': 3, 'PAUSED': 4, 'STOPPED': 5});

module.exports = {Session};