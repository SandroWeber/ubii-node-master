const Utils = require('../utilities');
const { ProcessingModule } = require('./processingModule');
const namida = require('@tum-far/namida/src/namida');

class ProcessingModuleManager {
  constructor(deviceManager, topicdataBuffer = undefined) {
    this.deviceManager = deviceManager;
    this.topicdataBuffer = topicdataBuffer;

    this.processingModules = new Map();
  }

  createModule(specs) {
    let pm = new ProcessingModule(specs);
    this.processingModules.set(pm.id, pm);
    pm.onCreated(pm.state);

    return pm;
  }

  addModule(pm) {
    if (!pm.id) {
      namida.logFailure('ProcessingModuleManager', 'module ' + pm.name + ' does not have an ID');
      return false;
    }
    this.processingModules.set(pm.id, pm);
    return true;
  }

  applyIOMappings(ioMappings) {
    if (this.topicdataBuffer) {
      this.configureIODirectTopicdataAccess(ioMappings);
    }
  }

  configureIODirectTopicdataAccess(ioMappings) {
    ioMappings.forEach((mapping) => {
      let processingModule = this.processingModules.get(mapping.processingModuleId);
      // connect inputs
      mapping.inputMappings.forEach((inputMapping) => {
        let topicSource = inputMapping[inputMapping.topicSource] || inputMapping.topicSource;
        if (typeof topicSource === 'string') {
          processingModule.setInputGetter(inputMapping.name, () => {
            let entry = this.topicdataBuffer.pull(topicSource);
            return entry && entry.data;
          });
        } else if (typeof topicSource === 'object') {
          let multiplexer = undefined;
          if (topicSource.id) {
            multiplexer = this.deviceManager.getTopicMux(topicSource.id);
          } else {
            multiplexer = this.deviceManager.addTopicMux(topicSource);
          }
          processingModule.setInputGetter(inputMapping.name, () => {
            return multiplexer.get();
          });
        }
      });
      // connect outputs
      mapping.outputMappings.forEach((outputMapping) => {
        let topicDestination =
          outputMapping[outputMapping.topicDestination] || outputMapping.topicDestination;
        if (typeof topicDestination === 'string') {
          let messageFormat = processingModule.getIOMessageFormat(outputMapping.name);
          let type = Utils.getTopicDataTypeFromMessageFormat(messageFormat);
          processingModule.setOutputSetter(outputMapping.name, (value) => {
            this.topicdataBuffer.publish(topicDestination, value, type);
          });
        } else if (typeof topicDestination === 'object') {
          let demultiplexer = undefined;
          if (topicDestination.id) {
            demultiplexer = this.deviceManager.getTopicDemux(topicDestination.id);
          } else {
            demultiplexer = this.deviceManager.addTopicDemux(topicDestination);
          }
          processingModule.setOutputSetter(outputMapping.name, (value) => {
            demultiplexer.push(value);
          });
        }
      });
    });
  }

  hasModuleID(id) {
    return this.processingModules.has(id);
  }
}

module.exports = ProcessingModuleManager;
