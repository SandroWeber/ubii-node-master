const sinon = require('sinon');

const { ProcessingModule } = require('../../src/index');

let getTopicForModuleIO = (processingModule, moduleIO) => {
  return '/' + processingModule.id + '/' + moduleIO.internalName;
};

let getDataForModuleIO = (moduleIO) => {
  if (moduleIO.messageFormat === 'bool') {
    return { bool: true };
  } else if (moduleIO.messageFormat === 'int32') {
    return { int32: 42 };
  } else if (moduleIO.messageFormat === 'string') {
    return { string: 'placeholder' };
  }

  return undefined;
};

let publishTopicForModuleIO = (topicdata, processingModule, moduleIO) => {
  let topic = getTopicForModuleIO(processingModule, moduleIO);
  let data = getDataForModuleIO(moduleIO);
  //console.info(['publishTopicForModuleIO()', topic, data]);
  topicdata.publish(topic, data);
};

let addProcessingModulesToSessionSpec = (sessionSpecs, processingModules) => {
  processingModules.forEach((pm) => {
    sessionSpecs.processingModules.push(pm.toProtobuf());

    let inputMappings = [];
    pm.inputs.forEach((input) => {
      inputMappings.push({
        inputName: input.internalName,
        topic: getTopicForModuleIO(pm, input),
        topicSource: 'topic'
      });
    });

    let outputMappings = [];
    pm.outputs.forEach((output) => {
      outputMappings.push({
        outputName: output.internalName,
        topic: getTopicForModuleIO(pm, output),
        topicDestination: 'topic'
      });
    });

    sessionSpecs.ioMappings.push({
      processingModuleId: pm.id,
      inputMappings: inputMappings,
      outputMappings: outputMappings
    });
  });
};

class TestProcessingModule extends ProcessingModule {
  constructor() {
    super();

    this.inputs = [
      { internalName: 'inBool', messageFormat: 'bool' },
      { internalName: 'inInt', messageFormat: 'int32' },
      { internalName: 'inString', messageFormat: 'string' }
    ];
    this.outputs = [
      { internalName: 'outBool', messageFormat: 'bool' },
      { internalName: 'outInt', messageFormat: 'int32' },
      { internalName: 'outString', messageFormat: 'string' }
    ];

    let produceOutput = () => {
      //console.info(['produceOutput()', this.name]);
      let processingResult = {
        outputs: {}
      };
      this.outputs.forEach((output) => {
        processingResult.outputs[output.internalName] = getDataForModuleIO(output);
      });

      //console.info(['produceOutput()', this.name, processingResult]);
      return processingResult;
    };

    this.onCreated = sinon.fake();
    this.onProcessing = sinon.fake(produceOutput);
  }
}

module.exports = {
  TestProcessingModule,
  getTopicForModuleIO,
  getDataForModuleIO,
  publishTopicForModuleIO,
  addProcessingModulesToSessionSpec
};
