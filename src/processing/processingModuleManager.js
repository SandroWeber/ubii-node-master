const Utils = require('../utilities');
const { ProcessingModule } = require('./processingModule');

class ProcessingModuleManager {
  constructor(deviceManager, topicdataBuffer = undefined) {
    this.deviceManager = deviceManager;
    this.topicdataBuffer = topicdataBuffer;

    this.modules = new Map();
  }

  createModule(specs) {
    let module = new ProcessingModule(specs);
    this.modules.set(module.id, module);

    return module;
  }

  applyIOMappings(ioMappings) {
    if (this.topicdataBuffer) {
      this.configureIODirectTopicdataAccess(ioMappings);
    }
  }

  configureIODirectTopicdataAccess(ioMappings) {
    //TODO: refactor session.proto for more abstract naming (get rid of interaction references)
    ioMappings.forEach((mapping) => {
      let module = this.modules.get(mapping.interactionId);
      // connect inputs
      mapping.inputMappings.forEach((inputMapping) => {
        if (inputMapping.topic) {
          module.setInputGetter(inputMapping.name, () => {
            let entry = this.topicdataBuffer.pull(inputMapping.topic);
            return entry && entry.data;
          });
        } else if (inputMapping.topicMux) {
          let multiplexer = this.deviceManager.getTopicMux(inputMapping.topicMux.id);
          module.setInputGetter(inputMapping.name, multiplexer.get);
        }
      });
      // connect outputs
      mapping.outputMappings.forEach((outputMapping) => {
        if (outputMapping.topic) {
          let messageFormat = module.getIOMessageFormat(outputMapping.name).messageFormat;
          let type = Utils.getTopicDataTypeFromMessageFormat(messageFormat);
          module.setOutputSetter(outputMapping.name, (value) => {
            this.topicdataBuffer.publish(outputMapping.topic, value, type);
          });
        } else if (outputMapping.topicDemux) {
          let demultiplexer = this.deviceManager.getTopicDemux(outputMapping.topicDemux.id);
          module.setOutputSetter(outputMapping.name, demultiplexer.push);
        }
      });
    });
  }
}

module.exports = ProcessingModuleManager;
