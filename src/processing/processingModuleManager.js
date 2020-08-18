const Utils = require('../utilities');
const { ProcessingModule } = require('./processingModule');

class ProcessingModuleManager {
  constructor() {
    this.modules = new Map();
  }

  createModule(specs) {
    let module = new ProcessingModule(specs);
    this.modules.set(module.id, module);
  }

  configureIODirectTopicdataAccess(ioMappings, topicdata, deviceManager) {
    //TODO: refactor session.proto for more abstract
    ioMappings.forEach((mapping) => {
      let module = this.modules.get(mapping.interactionId);
      // connect inputs
      mapping.inputMappings.forEach((inputMapping) => {
        if (inputMapping.topic) {
          module.setInputGetter(inputMapping.name, () => {
            let entry = topicdata.pull(inputMapping.topic);
            return entry && entry.data;
          });
        } else if (inputMapping.topicMux) {
          let multiplexer = deviceManager.getTopicMux(inputMapping.topicMux.id);
          module.setInputGetter(inputMapping.name, multiplexer.get);
        }
      });
      // connect outputs
      mapping.outputMappings.forEach((outputMapping) => {
        if (outputMapping.topic) {
          let messageFormat = module.getOutput(outputMapping.name).messageFormat;
          let type = Utils.getTopicDataTypeFromMessageFormat(messageFormat);
          module.setOutputSetter(outputMapping.name, (value) => {
            this.topicData.publish(outputMapping.topic, value, type);
          });
        } else if (outputMapping.topicDemux) {
          let demultiplexer = deviceManager.getTopicDemux(outputMapping.topicDemux.id);
          module.setOutputSetter(outputMapping.name, demultiplexer.push);
        }
      });
    });
  }
}

module.exports = ProcessingModuleManager;
