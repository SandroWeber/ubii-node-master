const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const { ProcessingModuleStorage } = require('@tum-far/ubii-node-nodejs');
const req = require('express/lib/request');

const { Service } = require('../service.js');

//TODO: rename to RegistryGetList ?

const protoSpecs = {
  topic: DEFAULT_TOPICS.SERVICES.PM_DATABASE_GET_LIST,
  requestMessageFormat: MSG_TYPES.PM_LIST,
  responseMessageFormat: MSG_TYPES.PM_LIST + ', ' + MSG_TYPES.ERROR,
  description:
    'Get a list of all PMs registered for all nodes. Sending PM specifications/profiles in the request is optional. When supplied it will filter responses.'
};


/**
 * Returns a list of available Processing Modules (PMs) fitting the requested list of profiles.
 * If the profile of an available PM completely fits at least one of the profiles in the requested list, it will be included.
 * Fields consisting of lists themselves like tags or authors are regarded as matches when all requested elements are present (i.e. may include additional ones).
 * Fields considered for filtering are: name, tags, authors, inputs, outputs.
 * Logically, different profiles in the requested list are treated as "OR" conditions whereas the fields of each profile are treated as "AND" condition.
 * If no profiles are provided in the request, all available PMs are included in the reply.
 * @param {*} request
 * @returns
 */
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
    if (!request || !request.elements || request.elements.length === 0) {
      responseList = allPMs;
    } else {
      responseList = this.filterProcessingModules(request.elements, allPMs);
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

  filterProcessingModules(requestedPMs, availablePMs) {
    let responseList = [];

    requestedPMs.forEach((pmRequestAlternative) => {
      let filteredPMs = availablePMs;
      if (pmRequestAlternative.name) {
        filteredPMs = filteredPMs.filter((pm) => pm.name === pmRequestAlternative.name);
      }
      if (pmRequestAlternative.authors) {
        filteredPMs = filteredPMs.filter((pm) =>
          pmRequestAlternative.authors.every((requestAuthor) => pm.authors.includes(requestAuthor))
        );
      }
      if (pmRequestAlternative.tags) {
        filteredPMs = filteredPMs.filter((pm) =>
          pmRequestAlternative.tags.every((requestTag) => pm.tags.includes(requestTag))
        );
      }
      if (pmRequestAlternative.inputs) {
        filteredPMs = filteredPMs.filter((pm) => {
          // if the request asks for two inputs of the same message format we do not want to count the same input for both accounts
          let potentialMatchingInputs = [...pm.inputs];
          for (let requestedInput of pmRequestAlternative.inputs) {
            let matchingInputIndex = potentialMatchingInputs.findIndex(
              (input) => input.messageFormat === requestedInput.messageFormat
            );
            if (matchingInputIndex === -1) return false;
            potentialMatchingInputs.splice(matchingInputIndex, 1);
          }
          return true;
        });
      }
      if (pmRequestAlternative.outputs) {
        filteredPMs = filteredPMs.filter((pm) => {
          // if the request asks for two inputs of the same message format we do not want to count the same input for both accounts
          let potentialMatchingOutputs = [...pm.outputs];
          for (let requestedInput of pmRequestAlternative.outputs) {
            let matchingInputIndex = potentialMatchingOutputs.findIndex(
              (input) => input.messageFormat === requestedInput.messageFormat
            );
            if (matchingInputIndex === -1) return false;
            potentialMatchingOutputs.splice(matchingInputIndex, 1);
          }
          return true;
        });
      }
      responseList = responseList.concat(filteredPMs);
    });

    return responseList;
  }
}

module.exports = ProcessingModuleDatabaseGetListService;
