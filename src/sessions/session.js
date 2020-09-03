const uuidv4 = require('uuid/v4');

const { proto } = require('@tum-far/ubii-msg-formats');
const ProcessMode = proto.ubii.sessions.ProcessMode;
const SessionStatus = proto.ubii.sessions.SessionStatus;
const InteractionStatus = proto.ubii.interactions.InteractionStatus;

const { Interaction } = require('./interaction');
const namida = require('@tum-far/namida');

class Session {
  constructor(
    {
      id,
      name = '',
      tags = [],
      description = '',
      authors = [],
      interactions = [],
      processingModules = [],
      ioMappings = [],
      processMode = ProcessMode.CYCLE_INTERACTIONS
    },
    topicData,
    deviceManager,
    processingModuleManager
  ) {
    this.id = id ? id : uuidv4();
    this.name = name;
    this.tags = tags;
    this.description = description;
    this.authors = authors;
    this.status = SessionStatus.CREATED;
    this.processMode = processMode;
    this.isProcessing = false;
    this.interactions = interactions;
    this.processingModules = processingModules;
    this.ioMappings = ioMappings;

    this.topicData = topicData;
    this.deviceManager = deviceManager;
    this.processingModuleManager = processingModuleManager;

    this.runtimeInteractions = [];
    this.runtimeProcessingModules = [];
  }

  start() {
    console.info('Session - start()');
    //console.info(this.interactions);
    //console.info(this.processingModules);
    if (this.isProcessing) {
      namida.logFailure('Session ' + this.id, "can't be started again, already processing");
      return false;
    }

    for (let interactionSpecs of this.interactions) {
      this.addInteraction(interactionSpecs);
    }
    if (this.runtimeInteractions.length > 0) {
      this.applyIOMappings();
    }

    console.info('Session start() - setting up PMs');
    // setup for processing modules
    for (let pmSpecs of this.processingModules) {
      let module = this.processingModuleManager.createModule(pmSpecs);
      if (module) {
        console.info(
          'Start Session ' +
            this.toString() +
            ' - instantiated module ' +
            module.name +
            ' for session ' +
            this.name
        );
        this.runtimeProcessingModules.push(module);
      } else {
        console.info(
          'Start Session ' +
            this.toString() +
            ' - could not instantiate module ' +
            module.name +
            ' for session ' +
            this.name
        );
      }
    }
    this.processingModuleManager.applyIOMappings(this.ioMappings);

    this.status = SessionStatus.RUNNING;
    this.isProcessing = true;

    if (this.processMode === ProcessMode.CYCLE_INTERACTIONS) {
      this.processInteractionsCycle().then(
        () => {},
        (rejected) => {
          console.info(rejected);
        }
      );
    } else if (this.processMode === ProcessMode.INDIVIDUAL_PROCESS_FREQUENCIES) {
      this.runtimeInteractions.forEach((interaction) => {
        interaction.run();
      });
    }

    this.runtimeProcessingModules.forEach((pm) => {
      pm.start();
    });

    return true;
  }

  stop() {
    if (this.status !== SessionStatus.RUNNING) {
      return false;
    }

    this.isProcessing = false;
    this.status = SessionStatus.STOPPED;

    for (let interaction of this.runtimeInteractions) {
      interaction.status = InteractionStatus.HALTED;
    }

    for (let processingModule of this.runtimeProcessingModules) {
      processingModule.stop();
    }

    return true;
  }

  processInteractionsCycle() {
    let processingCycleCallback = (i) => {
      if (!this.isProcessing) {
        for (let interaction of this.runtimeInteractions) {
          if (interaction.status === InteractionStatus.PROCESSING) {
            interaction.status = InteractionStatus.HALTED;
          }
        }
        return;
      }

      let interaction = this.runtimeInteractions[i % this.runtimeInteractions.length];
      if (interaction) {
        if (interaction.status === InteractionStatus.INITIALIZED) {
          interaction.status = InteractionStatus.PROCESSING;
        }
        interaction.process();
      }
      setTimeout(() => {
        processingCycleCallback(i + 1);
      }, 0);
    };

    return new Promise((resolve, reject) => {
      try {
        processingCycleCallback(0);
      } catch (error) {
        reject(error);
      }

      resolve('processInteractionsPromiseRecursive() resolved');
    });
  }

  addInteraction(specs) {
    if (
      !this.runtimeInteractions.some((interaction) => {
        return interaction.id === specs.id;
      })
    ) {
      let interaction = new Interaction(specs);
      interaction.setTopicData(this.topicData);
      interaction.onCreated();

      this.runtimeInteractions.push(interaction);

      return interaction;
    } else {
      console.warn(
        'Session ' + this.id + " - can't add interaction, ID " + specs.id + ' already exists'
      );
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
    this.ioMappings.forEach((mapping) => {
      let interaction = this.runtimeInteractions.find((interaction) => {
        return interaction.id === mapping.interactionId;
      });

      if (!interaction) {
        namida.error(
          'Session ' + this.id,
          'no interaction with ID ' + mapping.interactionId + ' for I/O mapping'
        );
        return;
      }

      mapping.inputMappings &&
        mapping.inputMappings.forEach((inputMapping) => {
          // single topic input target
          let topicSource = inputMapping[inputMapping.topicSource] || inputMapping.topicSource;
          if (typeof topicSource === 'string') {
            if (interaction.hasInput(inputMapping.name)) {
              if (!interaction.connectInputTopic(inputMapping.name, topicSource)) {
                namida.error(
                  'Session ' + this.id,
                  'failed to connect input topic ' +
                    inputMapping.topic +
                    ' to internal name ' +
                    inputMapping.name +
                    ' for interaction ' +
                    interaction.id
                );
              }
            } else {
              namida.error(
                'Session ' + this.id,
                'interaction ' + interaction.id + ' has no input with name ' + inputMapping.name
              );
            }
          }
          // topic mux
          else if (typeof topicSource === 'object') {
            let mux = this.deviceManager.addTopicMux(topicSource);
            interaction.connectMultiplexer(inputMapping.name, mux);
          }
        });

      mapping.outputMappings &&
        mapping.outputMappings.forEach((outputMapping) => {
          // single topic output target
          let topicDestination =
            outputMapping[outputMapping.topicDestination] || outputMapping.topicDestination;
          if (typeof topicDestination === 'string') {
            if (interaction.hasOutput(outputMapping.name)) {
              if (!interaction.connectOutputTopic(outputMapping.name, topicDestination)) {
                namida.error(
                  'Session ' + this.id,
                  'failed to connect output topic ' +
                    outputMapping.topic +
                    ' to internal name ' +
                    outputMapping.name +
                    ' for interaction ' +
                    interaction.id
                );
              }
            } else {
              namida.error(
                'Session ' + this.id,
                'interaction ' + interaction.id + ' has no output with name ' + outputMapping.name
              );
            }
          }
          // topic demux
          else if (typeof topicDestination === 'object') {
            let demux = this.deviceManager.addTopicDemux(topicDestination);
            interaction.connectDemultiplexer(outputMapping.name, demux);
          }
        });
    });
  }

  toProtobuf() {
    return {
      id: this.id,
      name: this.name,
      authors: this.authors,
      tags: this.tags,
      description: this.description,
      interactions: this.interactions,
      processingModules: this.processingModules,
      ioMappings: this.ioMappings
    };
  }

  toString() {
    return this.name + ' (ID ' + this.id + ')';
  }
}

module.exports = { Session };
