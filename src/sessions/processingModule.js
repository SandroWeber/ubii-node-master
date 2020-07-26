const uuidv4 = require('uuid/v4');
const InteractionStatus = proto.ubii.interactions.InteractionStatus;

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
                    onProcessing = '',    // functions' class followed by .functionname to call when processing client should process
                    onCreated = '',    // functions' class followed by .functionname to call when processingModule is created
                    input = [],  // lockstep: inputdata(TopicDataRecordList); others: topics to subscribe to
                    output = [], // lockstep: ouputdata(TopicDataRecordList); others: topics to publish to
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
        this.input = input;
        this.output = output;
        this.processingMode = processingMode;
        this.status = InteractionStatus.CREATED;
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
            input: this.input,
            output: this.output,
            processingMode: this.processingMode,
            status: this.status
        };
    }
}

module.exports = {
    ProcessingModule: ProcessingModule
};
