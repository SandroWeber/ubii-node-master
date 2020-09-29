const Utils = require('../utilities');
const { ProcessingModule } = require('./processingModule');
const namida = require('@tum-far/namida/src/namida');

class ProcessingModuleManager {
  constructor(deviceManager, topicdataBuffer = undefined) {
    this.deviceManager = deviceManager;
    this.topicdataBuffer = topicdataBuffer;

    this.processingModules = new Map();
    this.inputTriggerSubscriptions = new Map();
    this.lockstepInputTopicdata = {
      records: []
    };
    this.lockstepOutputTopicdata = {
      records: []
    };
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
            // lockstep mode
            if (processingModule.processingMode && processingModule.processingMode.lockstep) {
              processingModule.setInputGetter(inputMapping.inputName, () => {
                let record = this.lockstepInputTopicdata.records.find(
                  (record) => record.topic === topicSource
                );
                return record && record[record.type];
              });
            }
            // all async modes (immediate cycles, frequency, input trigger) - directly pull from topicdata buffer
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
                this.inputTriggerSubscriptions.set(processingModule.id, []);
              }
              this.inputTriggerSubscriptions.get(processingModule.id).push(subscriptionToken);
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
            // lockstep mode
            if (processingModule.processingMode && processingModule.processingMode.lockstep) {
              processingModule.setOutputSetter(inputMapping.inputName, (value) => {
                let record = { topic: topicDestination };
                record.type = type;
                record[type] = value;
                this.lockstepOutputTopicdata.records.push(record);
              });
            }
            // all async modes (immediate cycles, frequency, input trigger) - directly publish to topicdata buffer
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

  sendLockstepProcessingRequest(clientId, request) {
    if (clientId === undefined || clientId === 'local') {
      console.info('PMManager - lockstep request for local PMs');
      // server side PM
      return new Promise((resolve, reject) => {
        // assign input
        this.lockstepInputTopicdata.records = request.records;
        //TODO: need to map input names for lockstepInputTopicdata to records so it can be passed as second argument to onProcessingLockstepPass()
        // clear output
        this.lockstepOutputTopicdata.records = [];

        // lockstep pass calls to PMs
        let lockstepPasses = [];
        request.processingModuleIds.forEach((id) => {
          lockstepPasses.push(
            this.processingModules.get(id).onProcessingLockstepPass(request.deltaTimeMs)
          );
        });

        Promise.all(lockstepPasses).then(() => {
          console.info('PMManager - lockstep request for local PMs all done');
          // TODO: handle output
          return resolve();
        });
      });
    }
  }
}

module.exports = ProcessingModuleManager;
