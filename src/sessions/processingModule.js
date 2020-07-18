const uuidv4 = require('uuid/v4');

//TODO genereate msg-format for that
const PROCESSINGMODE = {
    LOCKSTEP: 0,
    ATFREQUENCY: 1,
    ATNEWTOPICDATA: 2,
    PROCESSINGMODE_MIN: this.LOCKSTEP,
    PROCESSINGMODE_MAX: this.ATNEWTOPICDATA
}

//TODO generate msg-format for that
class ProcessingModule {
    constructor({
                    id = uuidv4(),
                    name = '',
                    authors = [],
                    tags = [],
                    description = '',
                    processFrequency = 30, // eg. 30 Hz; only used in PROCESSINGMODE.ATFREQUENCY
                    onProcessing = '',    // function name to call when processing client should process
                    onCreated = '',    // function name to call when processingModule is created
                    inputFormats = [],  // lockstep: inputdata; others: topics to subscribe to
                    outputFormats = [], // lockstep: ouputdata; others: topics to publish to
                    processingMode = PROCESSINGMODE.LOCKSTEP
                }) {

        this.id = id;
        this.name = name;
        this.authors = authors;
        this.tags = tags;
        this.description = description;
        this.processFrequency = processFrequency;
        this.onProcessing = onProcessing;
        this.onCreated = onCreated;
        this.inputFormats = inputFormats;
        this.outputFormats = outputFormats;
        this.processingMode = processingMode;
    }


    toProtobuf() {
        return {
            id: this.id,
            name: this.name,
            authors: this.authors,
            tags: this.tags,
            description: this.description,
            processFrequency: this.processFrequency,
            onProcessing: this.onProcessing,
            onCreated: this.onCreated,
            inputFormats: this.inputFormats,
            outputFormats: this.outputFormats,
            processingMode: this.processingMode
        };
    }
}

module.exports = {
    ProcessingModule: ProcessingModule
};
