{
    "name": "TestModuleProto",
    "authors": [
        "author"
    ],
    "tags": [
        "tag1",
        "tag2"
    ],
    "description": "lorem ipsum",
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
    "onCreatedStringified": "(state) => {\n  // Your initialization code here.\n}",
    "onProcessingStringified": "(deltaTime, inputs, outputs, state) => {\n\n  // Your code here.\n\n  this.defaultOut = this.defaultIn;\n}"
}