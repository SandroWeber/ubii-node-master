const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const { ProcessingModuleStorage } = require('@tum-far/ubii-node-nodejs');
const req = require('express/lib/request');

const { Service } = require('../service.js');

//TODO: rename to RuntimeGetList

const protoSpecs = {
  topic: DEFAULT_TOPICS.SERVICES.PM_DATABASE_GET_LIST,
  requestMessageFormat: MSG_TYPES.PM,
  responseMessageFormat: MSG_TYPES.PM_LIST + ', ' + MSG_TYPES.ERROR,
  description: 'Get a list of all PMs registered for all nodes. Sending a PM specification in the request is optional. When supplied it will filter responses'
}

class ProcessingModuleDatabaseGetListService extends Service {
  constructor(clientManager) {
    super(
      protoSpecs.topic,
      protoSpecs.requestMessageFormat,
      protoSpecs.responseMessageFormat,
    );

    this.clientManager = clientManager;

    this.description = protoSpecs.description;
  }

  reply(request) {
    let pmList = ProcessingModuleStorage.instance.getAllSpecs();
    this.clientManager.getClientList().forEach(client => {
      client.processingModules.forEach(pm => {
        pmList.push(pm);
      })
    });

    if (request) {
      console.info(request);
      if (request.name) {
        pmList = pmList.filter(pm => pm.name === request.name);
      }
      if (request.authors) {
        pmList = pmList.filter(pm => 
          request.authors.every(requestAuthor => pm.authors.includes(requestAuthor))
        );
      }
      if (request.tags) {
        pmList = pmList.filter(pm => 
          request.tags.every(requestTag => pm.tags.includes(requestTag))
        );
      }
    }

    if (typeof pmList === 'undefined') {
      return {
        error: {
          title: 'ProcessingModuleDatabaseGetService Error',
          message: 'error getting list of PMs'
        }
      };
    } else {
      return {
        processingModuleList: {
          elements: pmList
        }
      };
    }
  }
}

module.exports = ProcessingModuleDatabaseGetListService;
