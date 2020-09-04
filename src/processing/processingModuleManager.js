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

  applyIOMappings(ioMappings) {
    if (this.topicdataBuffer) {
      this.configureIODirectTopicdataAccess(ioMappings);
    }
  }

  configureIODirectTopicdataAccess(ioMappings) {
    //TODO: refactor session.proto for more abstract naming (get rid of interaction references)
    ioMappings.forEach((mapping) => {
      let processingModule = this.processingModules.get(mapping.interactionId);
      // connect inputs
      mapping.inputMappings.forEach((inputMapping) => {
        let topicSource = inputMapping[inputMapping.topicSource] || inputMapping.topicSource;
        if (typeof topicSource === 'string') {
          processingModule.setInputGetter(inputMapping.name, () => {
            let entry = this.topicdataBuffer.pull(topicSource);
            return entry && entry.data;
          });
        } else if (typeof topicSource === 'object') {
          let multiplexer = this.deviceManager.getTopicMux(topicSource.id);
          processingModule.setInputGetter(inputMapping.name, multiplexer.get);
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
          let demultiplexer = this.deviceManager.getTopicDemux(topicDestination.id);
          processingModule.setOutputSetter(outputMapping.name, demultiplexer.push);
        }
      });
    });
  }
}

module.exports = ProcessingModuleManager;
