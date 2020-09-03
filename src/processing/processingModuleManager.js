const Utils = require('../utilities');
const { ProcessingModule } = require('./processingModule');

class ProcessingModuleManager {
  constructor(deviceManager, topicdataBuffer = undefined) {
    this.deviceManager = deviceManager;
    this.topicdataBuffer = topicdataBuffer;

    this.modules = new Map();
  }

  createModule(specs) {
    console.info('PM Manager createModule() - specs:');
    console.info(specs);
    let pm = new ProcessingModule(specs);
    console.info('PM Manager createModule() - module instantiated:');
    console.info(pm);
    this.modules.set(pm.id, pm);

    return pm;
  }

  applyIOMappings(ioMappings) {
    console.info('PMManager - applyIOMappings()');
    if (this.topicdataBuffer) {
      this.configureIODirectTopicdataAccess(ioMappings);
    }
  }

  configureIODirectTopicdataAccess(ioMappings) {
    console.info('PMManager configureIODirectTopicdataAccess()');
    //TODO: refactor session.proto for more abstract naming (get rid of interaction references)
    ioMappings.forEach((mapping) => {
      let processingModule = this.modules.get(mapping.interactionId);
      console.info('PM id: ' + processingModule.id);
      // connect inputs
      mapping.inputMappings.forEach((inputMapping) => {
        console.info('inputMapping:');
        console.info(inputMapping);
        let topicSource = inputMapping[inputMapping.topicSource] || inputMapping.topicSource;
        console.info(topicSource);
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
        console.info('outputMapping:');
        console.info(outputMapping);
        let topicDestination =
          outputMapping[outputMapping.topicDestination] || outputMapping.topicDestination;
        console.info(topicDestination);
        if (typeof topicDestination === 'string') {
          let messageFormat = processingModule.getIOMessageFormat(outputMapping.name);
          console.info('messageFormat: ' + messageFormat);
          let type = Utils.getTopicDataTypeFromMessageFormat(messageFormat);
          console.info('type: ' + type);
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
