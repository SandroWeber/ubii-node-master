{
    "name": "my processing module",
    "authors": [
        "sandro"
    ],
    "tags": [
        "tag1",
        "tag2"
    ],
    "description": "asdfqwer",
    "processingMode": {
        "frequency ": {
            "hertz": 30
        }
    },
    "inputs": [
        {
            "internalName": "defaultIn",
            "messageFormat": "messageFormat"
        }
    ],
    "outputs": [
        {
            "internalName": "defaultOut",
            "messageFormat": "messageFormat"
        }
    ],
    "onCreatedStringified ": "(state) => {\n  // Your initialization code here.\n}",
    "onProcessingStringified ": "(deltaTime, inputs, outputs, state) => {\n\n  // Your code here.\n\n  outputs.defaultOut = inputs.defaultIn;\n}"
}