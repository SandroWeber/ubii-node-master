const EventEmitter = require('events');

const namida = require('@tum-far/namida/src/namida');
const { RuntimeTopicData } = require('@tum-far/ubii-topic-data');
const { proto } = require('@tum-far/ubii-msg-formats');
const ProcessingModuleProto = proto.ubii.processing.ProcessingModule;

const workerpool = require('workerpool');

const Utils = require('../utilities');
const { ProcessingModule } = require('./processingModule');
const ProcessingModuleStorage = require('../storage/processingModuleStorage');

class ProcessingModuleManager extends EventEmitter {
  constructor(nodeID, deviceManager, topicData = undefined) {
    super();

    this.nodeID = nodeID;
    this.deviceManager = deviceManager;
    this.topicData = topicData;

    this.processingModules = new Map();
    this.ioMappings = new Map();
    this.pmTopicSubscriptions = new Map();

    //TODO: optimize for use without real TopicData, avoiding write/read cycles for each lockstep request/reply
    this.lockstepTopicData = new RuntimeTopicData();
    /*this.lockstepInputTopicdata = {
      records: []
    };
    this.lockstepOutputTopicdata = {
      records: []
    };*/

    this.workerPool = workerpool.pool();
  }

  createModule(specs) {
    if (specs.id && this.processingModules.has(specs.id)) {
      namida.logFailure(
        'ProcessingModuleManager',
        "can't create module " + specs.name + ', ID already exists: ' + specs.id
      );
    }

    let pm = undefined;
    if (ProcessingModuleStorage.hasEntry(specs.name)) {
      pm = ProcessingModuleStorage.createInstance(specs);
      //TODO: make ID and sessionID / whole specs part of the instace creation call parameters for storage
      //if (specs.id) pm.id = specs.id;
      //if (specs.sessionId) pm.sessionId = specs.sessionId;
    } else {
      // create new module based on specs
      if (!specs.onProcessingStringified) {
        namida.logFailure(
          'ProcessingModuleManager',
          'can\'t create PM "' + specs.name + '" based on specs, missing onProcessing definition.'
        );
        return undefined;
      }
      pm = new ProcessingModule(specs);
    }
    pm.nodeId = this.nodeID;

    let success = this.addModule(pm);
    if (!success) {
      return undefined;
    } else {
      pm.initialized = this.initializeModule(pm);
      return pm;
    }
  }

  async initializeModule(pm) {
    try {
      pm.onCreated && await pm.onCreated(pm.state);
      await pm.setWorkerPool(this.workerPool);

      return true;
    }
    catch (error) {
      namida.logFailure(this.toString(), 'PM initialization error:\n' + error);
      return false;
    }
  }

  addModule(pm) {
    if (!pm.id) {
      namida.logFailure('ProcessingModuleManager', 'module ' + pm.name + " does not have an ID, can't add");
      return false;
    }
    this.processingModules.set(pm.id, pm);
    return true;
  }

  removeModule(pm) {
    if (!pm.id) {
      namida.logFailure('ProcessingModuleManager', 'module ' + pm.name + " does not have an ID, can't remove");
      return false;
    }

    if (this.pmTopicSubscriptions.has(pm.id)) {
      let subscriptionTokens = this.pmTopicSubscriptions.get(pm.id);
      subscriptionTokens.forEach((token) => {
        this.topicData.unsubscribe(token);
      });
      this.pmTopicSubscriptions.delete(pm.id);
    }

    this.processingModules.delete(pm.id);
  }

  hasModuleID(id) {
    return this.processingModules.has(id);
  }

  getModuleBySpecs(pmSpecs, sessionID) {
    return this.getModuleByID(pmSpecs.id) || this.getModuleByName(pmSpecs.name, sessionID);
  }

  getModuleByID(id) {
    return this.processingModules.get(id);
  }

  getModuleByName(name, sessionID) {
    let candidates = [];
    this.processingModules.forEach((pm) => {
      if (pm.name === name) {
        candidates.push(pm);
      }
    });

    if (sessionID) {
      candidates = candidates.filter((element) => element.sessionId === sessionID);
    }

    if (candidates.length > 1) {
      namida.logFailure(
        'ProcessingModuleManager',
        'trying to get PM by name (' + name + ') resulted in multiple candidates'
      );
    } else {
      return candidates[0];
    }
  }

  getModulesProcessing() {
    return this.getModulesByStatus(ProcessingModuleProto.Status.PROCESSING);
  }

  getModulesByStatus(status) {
    return Array.from(this.processingModules)
      .map((keyValue) => {
        return keyValue[1];
      })
      .filter((pm) => pm.status === status);
  }

  /* running modules */

  startModule(pmSpec) {
    let pm = this.processingModules.get(pmSpec.id);
    pm && pm.start();
  }

  stopModule(pmSpec) {
    let pm = this.processingModules.get(pmSpec.id);
    pm && pm.stop();
    let subs = this.pmTopicSubscriptions.get(pmSpec.id);
    subs &&
      subs.forEach((token) => {
        this.topicData.unsubscribe(token);
      });
  }

  startSessionModules(session) {
    this.processingModuleManager.processingModules.forEach((pm) => {
      if (pm.sessionId === session.id) {
        pm.start();
      }
    });
  }
  
  stopSessionModules(session) {
    this.processingModuleManager.processingModules.forEach((pm) => {
      if (pm.sessionId === session.id) {
        pm.stop();
      }
    });
  }

  /* I/O <-> topic mapping functions */

  applyIOMappings(ioMappings, sessionID) {
    // filter out I/O mappings for PMs that run on this node
    let applicableIOMappings = ioMappings.filter((ioMapping) =>
      this.processingModules.has(ioMapping.processingModuleId)
    );

    //TODO: refactor into something more readable
    console.info('\napplicableIOMappings');
    console.info(applicableIOMappings);

    applicableIOMappings.forEach((mapping) => {
      this.ioMappings.set(mapping.processingModuleId, mapping);
      let processingModule =
      this.getModuleByID(mapping.processingModuleId) || this.getModuleByName(mapping.processingModuleName, sessionID);
      if (!processingModule) {
        namida.logFailure(
          'ProcessingModuleManager',
          "can't find processing module for I/O mapping, given: ID = " +
            mapping.processingModuleId +
            ', name = ' +
            mapping.processingModuleName +
            ', session ID = ' +
            sessionID
        );
        return;
      }

      let isLockstep = processingModule.processingMode && processingModule.processingMode.lockstep;

      // connect inputs
      mapping.inputMappings &&
        mapping.inputMappings.forEach((inputMapping) => {
          if (!this.isValidIOMapping(processingModule, inputMapping)) {
            namida.logFailure(
              'ProcessingModuleManager',
              'IO-Mapping for module ' + processingModule.name + '->' + inputMapping.inputName + ' is invalid'
            );
            return;
          }

          let topicSource =
            inputMapping[inputMapping.topicSource] ||
            inputMapping.topicSource ||
            inputMapping.topic ||
            inputMapping.topicMux;
          // single topic input
          if (typeof topicSource === 'string') {
            // decide if we pull from lockstep data or asynchronously
            let topicDataBuffer = isLockstep ? this.lockstepTopicData : this.topicData;
            // set accessor accordingly
            processingModule.setInputGetter(inputMapping.inputName, () => {
              let entry = topicDataBuffer.pull(topicSource);
              return entry && entry.data;
            });

            if (!isLockstep) {
              let callback = () => {};
              // if PM is triggered on input, notify PM for new input
              //TODO: needs to be done for topic muxer too? does it make sense for accumulated topics to trigger processing?
              // use-case seems not to match but leaving opportunity open could be nice
              if (processingModule.processingMode && processingModule.processingMode.triggerOnInput) {
                callback = () => {
                  processingModule.emit(ProcessingModule.EVENTS.NEW_INPUT, inputMapping.inputName);
                };
              }

              let subscriptionToken = this.topicData.subscribe(topicSource, callback);
              if (!this.pmTopicSubscriptions.has(processingModule.id)) {
                this.pmTopicSubscriptions.set(processingModule.id, []);
              }
              this.pmTopicSubscriptions.get(processingModule.id).push(subscriptionToken);
            }
          }
          // topic muxer input
          else if (typeof topicSource === 'object') {
            // decide if we pull from lockstep data or asynchronously
            let multiplexer = undefined;
            if (topicSource.id) {
              multiplexer = this.deviceManager.getTopicMux(topicSource.id);
            } else {
              let topicDataBuffer = isLockstep ? this.lockstepTopicData : this.topicData;
              multiplexer = this.deviceManager.createTopicMuxerBySpecs(topicSource, topicDataBuffer);
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
              'IO-Mapping for module ' + processingModule.toString() + '->' + outputMapping.outputName + ' is invalid'
            );
            return;
          }

          let topicDestination =
            outputMapping[outputMapping.topicDestination] ||
            outputMapping.topicDestination ||
            outputMapping.topic ||
            outputMapping.topicDemux;
          // single topic output
          if (typeof topicDestination === 'string') {
            let messageFormat = processingModule.getIOMessageFormat(outputMapping.outputName);
            let type = Utils.getTopicDataTypeFromMessageFormat(messageFormat);

            let topicDataBuffer = isLockstep ? this.lockstepTopicData : this.topicData;
            processingModule.setOutputSetter(outputMapping.outputName, (value) => {
              topicDataBuffer.publish(topicDestination, value, type);
            });

            /*// lockstep mode
            if (isLockstep) {
              processingModule.setOutputSetter(inputMapping.inputName, (value) => {
                let record = { topic: topicDestination };
                record.type = type;
                record[type] = value;
                this.lockstepOutputTopicdata.records.push(record);
              });
            }
            // all async modes (immediate cycles, frequency, input trigger) - directly publish to topicdata buffer
            processingModule.setOutputSetter(outputMapping.outputName, (value) => {
              this.topicData.publish(topicDestination, value, type);
            });*/
          }
          // topic demuxer output
          else if (typeof topicDestination === 'object') {
            let demultiplexer = undefined;
            if (topicDestination.id) {
              demultiplexer = this.deviceManager.getTopicDemux(topicDestination.id);
            } else {
              let topicDataBuffer = isLockstep ? this.lockstepTopicData : this.topicData;
              demultiplexer = this.deviceManager.createTopicDemuxerBySpecs(topicDestination, topicDataBuffer);
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
      return processingModule.inputs.some((element) => element.internalName === ioMapping.inputName);
    } else if (ioMapping.outputName) {
      return processingModule.outputs.some((element) => element.internalName === ioMapping.outputName);
    }

    return false;
  }

  /* I/O <-> topic mapping functions end */

  /* lockstep processing functions */

  sendLockstepProcessingRequest(nodeId, request) {
    if (nodeId === this.nodeID) {
      // server side PM
      return new Promise((resolve, reject) => {
        // assign input
        request.records.forEach((record) => {
          //TODO: refactor without use of extra topicdata to avoid write/read cycles
          this.lockstepTopicData.publish(record.topic, record[record.type], record.type);
        });
        //this.lockstepInputTopicdata.records = request.records;
        //TODO: need to map input names for lockstepInputTopicdata to records so it can be passed as second argument to onProcessingLockstepPass()
        // clear output
        //this.lockstepOutputTopicdata.records = [];

        // lockstep pass calls to PMs
        let lockstepPasses = [];
        request.processingModuleIds.forEach((id) => {
          lockstepPasses.push(this.processingModules.get(id).onProcessingLockstepPass(request.deltaTimeMs));
        });

        Promise.all(lockstepPasses).then(() => {
          let reply = this.produceLockstepProcessingReply(request);
          return resolve(reply);
        });
      });
    }
  }

  produceLockstepProcessingReply(lockstepProcessingRequest) {
    let lockstepProcessingReply = {
      processingModuleIds: [],
      records: []
    };
    lockstepProcessingRequest.processingModuleIds.forEach((id) => {
      lockstepProcessingReply.processingModuleIds.push(id);
      this.processingModules.get(id).outputs.forEach((pmOutput) => {
        let outputMapping = this.ioMappings
          .get(id)
          .outputMappings.find((mapping) => mapping.outputName === pmOutput.internalName);
        let destination = outputMapping[outputMapping.topicDestination] || outputMapping.topicDestination;

        // single topic
        let topicdataEntry = this.lockstepTopicData.pull(destination);
        if (topicdataEntry) {
          let record = {
            topic: destination,
            type: topicdataEntry.type
          };
          record[record.type] = topicdataEntry.data;
          lockstepProcessingReply.records.push(record);
        }
        //TODO: handle demuxer output
      });
    });

    return lockstepProcessingReply;
  }

  /* lockstep processing functions end */
}

ProcessingModuleManager.EVENTS = Object.freeze({
  PM_STARTED: 'PM_STARTED'
});

module.exports = ProcessingModuleManager;
