const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const { ProcessingModuleStorage } = require('@tum-far/ubii-node-nodejs');
const req = require('express/lib/request');

const { Service } = require('../service.js');

//TODO: rename to RuntimeGetList

const protoSpecs = {
  topic: DEFAULT_TOPICS.SERVICES.PM_DATABASE_GET_LIST,
  requestMessageFormat: MSG_TYPES.PM_LIST,
  responseMessageFormat: MSG_TYPES.PM_LIST + ', ' + MSG_TYPES.ERROR,
  description:
    'Get a list of all PMs registered for all nodes. Sending a PM specification in the request is optional. When supplied it will filter responses'
};

class ProcessingModuleDatabaseGetListService extends Service {
  constructor(clientManager) {
    super(protoSpecs.topic, protoSpecs.requestMessageFormat, protoSpecs.responseMessageFormat);

    this.clientManager = clientManager;

    this.description = protoSpecs.description;
  }

  reply(request) {
    let allPMs = ProcessingModuleStorage.instance.getAllSpecs();
    this.clientManager.getClientList().forEach((client) => {
      client.processingModules.forEach((pm) => {
        allPMs.push(pm);
      });
    });

    let responseList = [];
    if (request) {
      request.elements.forEach((pmRequestAlternative) => {
        let filteredList = allPMs;
        if (pmRequestAlternative.name) {
          filteredList = filteredList.filter((pm) => pm.name === pmRequestAlternative.name);
        }
        if (pmRequestAlternative.authors) {
          filteredList = filteredList.filter((pm) =>
            pmRequestAlternative.authors.every((requestAuthor) => pm.authors.includes(requestAuthor))
          );
        }
        if (pmRequestAlternative.tags) {
          filteredList = filteredList.filter((pm) =>
            pmRequestAlternative.tags.every((requestTag) => pm.tags.includes(requestTag))
          );
        }
        if (pmRequestAlternative.inputs) {
          filteredList = filteredList.filter((pm) => {
            // if the request asks for two inputs of the same message format we do not want to count the same input for both accounts 
            let potentialMatchingInputs = [...pm.inputs];
            for (let requestedInput of pmRequestAlternative.inputs) {
              let matchingInputIndex = potentialMatchingInputs.findIndex(input => input.messageFormat === requestedInput.messageFormat);
              if (matchingInputIndex === -1) return false;
              potentialMatchingInputs.splice(matchingInputIndex, 1);
            }
            return true;
          });
        }
        if (pmRequestAlternative.outputs) {
          filteredList = filteredList.filter((pm) => {
            // if the request asks for two inputs of the same message format we do not want to count the same input for both accounts 
            let potentialMatchingOutputs = [...pm.outputs];
            for (let requestedInput of pmRequestAlternative.outputs) {
              let matchingInputIndex = potentialMatchingOutputs.findIndex(input => input.messageFormat === requestedInput.messageFormat);
              if (matchingInputIndex === -1) return false;
              potentialMatchingOutputs.splice(matchingInputIndex, 1);
            }
            return true;
          });
        }
        responseList = responseList.concat(filteredList);
      });
    }

    if (typeof allPMs === 'undefined') {
      return {
        error: {
          title: 'ProcessingModuleDatabaseGetService Error',
          message: 'error getting list of PMs'
        }
      };
    } else {
      return {
        processingModuleList: {
          elements: responseList
        }
      };
    }
  }
}

module.exports = ProcessingModuleDatabaseGetListService;
