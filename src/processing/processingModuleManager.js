const Utils = require('../utilities');
const { ProcessingModule } = require('./processingModule');
const namida = require('@tum-far/namida/src/namida');

class ProcessingModuleManager {
  constructor(deviceManager, topicdataBuffer = undefined) {
    this.deviceManager = deviceManager;
    this.topicdataBuffer = topicdataBuffer;

    this.processingModules = new Map();
    this.inputTriggerSubscriptions = new Map();
  }

  createModule(specs) {
    let pm = new ProcessingModule(specs);
    this.processingModules.set(pm.id, pm);
    pm.onCreated(pm.state);

    return pm;
  }

  addModule(pm) {
    if (!pm.id) {
      namida.logFailure(
        'ProcessingModuleManager',
        'module ' + pm.name + " does not have an ID, can't add"
      );
      return false;
    }
    this.processingModules.set(pm.id, pm);
    return true;
  }

  removeModule(pm) {
    if (!pm.id) {
      namida.logFailure(
        'ProcessingModuleManager',
        'module ' + pm.name + " does not have an ID, can't remove"
      );
      return false;
    }

    if (this.inputTriggerSubscriptions.has(pm.id)) {
      let subscriptionTokens = this.inputTriggerSubscriptions.get(pm.id);
      subscriptionTokens.forEach((token) => {
        this.topicdataBuffer.unsubscribe(token);
      });
      this.inputTriggerSubscriptions.delete(pm.id);
    }

    this.processingModules.delete(pm.id);
  }

  hasModuleID(id) {
    return this.processingModules.has(id);
  }

  getModuleByID(id) {
    return this.processingModules.get(id);
  }

  applyIOMappings(ioMappings) {
    if (this.topicdataBuffer) {
      this.configureIODirectTopicdataAccess(ioMappings);
    }
  }

  /* I/O <-> topic mapping functions */

  configureIODirectTopicdataAccess(ioMappings) {
    ioMappings.forEach((mapping) => {
      let processingModule = this.processingModules.get(mapping.processingModuleId);
      if (!processingModule) {
        namida.logFailure(
          'ProcessingModuleManager',
          "can't find processing module with ID " + mapping.processingModuleId
        );
        return;
      }

      //TODO: if PM is running in lockstep mode, set getter/setter accordingly

      // connect inputs
      mapping.inputMappings &&
        mapping.inputMappings.forEach((inputMapping) => {
          if (!this.isValidIOMapping(processingModule, inputMapping)) {
            namida.logFailure(
              'ProcessingModuleManager',
              'IO-Mapping for module ' +
                processingModule.name +
                '->' +
                inputMapping.inputName +
                ' is invalid'
            );
            return;
          }

          let topicSource = inputMapping[inputMapping.topicSource] || inputMapping.topicSource;
          // single topic input
          if (typeof topicSource === 'string') {
            processingModule.setInputGetter(inputMapping.inputName, () => {
              let entry = this.topicdataBuffer.pull(topicSource);
              return entry && entry.data;
            });

            // if PM is triggered on input, notify PM for new input
            if (processingModule.processingMode && processingModule.processingMode.triggerOnInput) {
              let subscriptionToken = this.topicdataBuffer.subscribe(topicSource, () => {
                processingModule.emit(ProcessingModule.EVENTS.NEW_INPUT, inputMapping.inputName);
              });

              if (!this.inputTriggerSubscriptions.has(processingModule.id)) {
                this.inputTriggerSubscriptions.set(processingModule.id, [subscriptionToken]);
              } else {
                this.inputTriggerSubscriptions.get(processingModule.id).push(subscriptionToken);
              }
            }
          }
          // topic muxer input
          else if (typeof topicSource === 'object') {
            let multiplexer = undefined;
            if (topicSource.id) {
              multiplexer = this.deviceManager.getTopicMux(topicSource.id);
            } else {
              multiplexer = this.deviceManager.addTopicMux(topicSource);
            }
            processingModule.setInputGetter(inputMapping.inputName, () => {
              return multiplexer.get();
            });
          }
        });
      // connect outputs
      mapping.outputMappings &&
        mapping.outputMappings.forEach((outputMapping) => {
          if (!this.isValidIOMapping(processingModule, outputMapping)) {
            namida.logFailure(
              'ProcessingModuleManager',
              'IO-Mapping for module ' +
                processingModule.toString() +
                '->' +
                outputMapping.outputName +
                ' is invalid'
            );
            return;
          }

          let topicDestination =
            outputMapping[outputMapping.topicDestination] || outputMapping.topicDestination;
          // single topic output
          if (typeof topicDestination === 'string') {
            let messageFormat = processingModule.getIOMessageFormat(outputMapping.outputName);
            let type = Utils.getTopicDataTypeFromMessageFormat(messageFormat);
            processingModule.setOutputSetter(outputMapping.outputName, (value) => {
              this.topicdataBuffer.publish(topicDestination, value, type);
            });
          }
          // topic demuxer output
          else if (typeof topicDestination === 'object') {
            let demultiplexer = undefined;
            if (topicDestination.id) {
              demultiplexer = this.deviceManager.getTopicDemux(topicDestination.id);
            } else {
              demultiplexer = this.deviceManager.addTopicDemux(topicDestination);
            }
            processingModule.setOutputSetter(outputMapping.outputName, (value) => {
              demultiplexer.push(value);
            });
          }
        });
    });
  }

  isValidIOMapping(processingModule, ioMapping) {
    if (ioMapping.inputName) {
      return processingModule.inputs.some(
        (element) => element.internalName === ioMapping.inputName
      );
    } else if (ioMapping.outputName) {
      return processingModule.outputs.some(
        (element) => element.internalName === ioMapping.outputName
      );
    }

    return false;
  }

  /* I/O <-> topic mapping functions end */

  sendLockstepProcessingRequest(pm, request) {
    if (pm.clientId === undefined) {
      // server side PM
      return this.processingModules
        .get(pm.id)
        .onProcessingLockstepPass(request.deltaTimeMs, todoinputs, todooutputs);
    }
  }
}

module.exports = ProcessingModuleManager;
