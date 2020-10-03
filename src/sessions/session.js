const uuidv4 = require('uuid/v4');

const { proto } = require('@tum-far/ubii-msg-formats');
const SessionStatus = proto.ubii.sessions.SessionStatus;
const ProcessingModuleProto = proto.ubii.processing.ProcessingModule;

const namida = require('@tum-far/namida');

class Session {
  constructor(
    {
      id,
      name = '',
      tags = [],
      description = '',
      authors = [],
      processingModules = [],
      ioMappings = []
    },
    topicData,
    deviceManager,
    processingModuleManager
  ) {
    this.id = id ? id : uuidv4();
    this.name = name;
    this.tags = tags;
    this.description = description;
    this.authors = authors;
    this.status = SessionStatus.CREATED;
    this.processingModules = processingModules;
    this.ioMappings = ioMappings;

    this.topicData = topicData;
    this.deviceManager = deviceManager;
    this.processingModuleManager = processingModuleManager;

    this.runtimeProcessingModules = [];
    this.lockstepProcessingModules = new Map();
  }

  start() {
    if (this.status === SessionStatus.RUNNING) {
      namida.logFailure('Session ' + this.id, "can't be started again, already processing");
      return false;
    }

    this.status = SessionStatus.RUNNING;

    // setup for processing modules
    if (this.processingModules && this.processingModules.length > 0) {
      for (let pmSpecs of this.processingModules) {
        let pm = this.processingModuleManager.getModuleBySpecs(pmSpecs, this.id);
        if (!pm) {
          pm = this.processingModuleManager.createModule(pmSpecs);
        }
        if (pm) {
          pm.sessionId = this.id;
          this.runtimeProcessingModules.push(pm);
        } else {
          namida.logFailure(
            this.toString(),
            'could not instantiate processing module ' + pmSpecs.name
          );
        }
      }
    }

    this.processingModuleManager.applyIOMappings(this.ioMappings, this.id);

    this.runtimeProcessingModules.forEach((pm) => {
      // processing mode = lockstep ?
      if (pm.processingMode && pm.processingMode.lockstep) {
        let clientID = pm.clientId || 'local';
        if (!this.lockstepProcessingModules.has(clientID)) {
          this.lockstepProcessingModules.set(clientID, []);
        }
        this.lockstepProcessingModules.get(clientID).push(pm);
      }
      // start
      pm.start();
    });
    this.tLastLockstepPass = Date.now();
    this.lockstepProcessingPass();

    return true;
  }

  stop() {
    if (this.status !== SessionStatus.RUNNING) {
      return false;
    }

    this.status = SessionStatus.STOPPED;

    for (let processingModule of this.runtimeProcessingModules) {
      processingModule.stop();
      this.processingModuleManager.removeModule(processingModule);
    }

    this.runtimeProcessingModules = [];
    this.lockstepProcessingModules = new Map();

    return true;
  }

  lockstepProcessingPass() {
    // timing
    let tNow = Date.now();
    let deltaTime = tNow - this.tLastLockstepPass;
    this.tLastLockstepPass = tNow;

    // gather inputs
    let processingPromises = [];
    this.lockstepProcessingModules.forEach((pms, clientID) => {
      // one request per client
      let lockstepProcessingRequest = {
        processingModuleIds: [],
        records: [],
        deltaTimeMs: deltaTime
      };

      pms.forEach((pm) => {
        lockstepProcessingRequest.processingModuleIds.push(pm.id);

        // gather inputs for all PMs running under client ID
        let inputMappings = this.ioMappings.find((element) => element.processingModuleId === pm.id)
          .inputMappings;
        if (inputMappings) {
          pm.inputs.forEach((input) => {
            let inputMapping = inputMappings.find(
              (element) => element.inputName === input.internalName
            );
            let topicSource = inputMapping[inputMapping.topicSource] || inputMapping.topicSource;
            // single topic input
            if (typeof topicSource === 'string') {
              let topicdataEntry = this.topicData.pull(topicSource);
              let record = { topic: topicSource };
              record.type = topicdataEntry.type;
              record[topicdataEntry.type] = topicdataEntry.data;
              lockstepProcessingRequest.records.push(record);
            }
            // topic muxer input
            else if (typeof topicSource === 'object') {
              let records = this.deviceManager.getTopicMux(topicSource.id).get();
              lockstepProcessingRequest.records.push(...records);
            }
          });
        }
      });

      // send out request, save promise
      processingPromises.push(
        this.processingModuleManager
          .sendLockstepProcessingRequest(clientID, lockstepProcessingRequest)
          .then((lockstepProcessingReply) => {
            // sanity check making sure all PMs were included
            let allProcessingModulesReplied = lockstepProcessingRequest.processingModuleIds.every(
              (id) => lockstepProcessingReply.processingModuleIds.includes(id)
            );
            if (!allProcessingModulesReplied) {
              let missingIDs = lockstepProcessingRequest.processingModuleIds.filter(
                (id) => !lockstepProcessingReply.processingModuleIds.includes(id)
              );
              let message = 'not all ProcessingModules replied during lockstep pass, missing are:';
              missingIDs.forEach((id) => {
                let pm = this.processingModuleManager.getModuleByID(id);
                message += '\n' + pm.toString();
              });
              namida.logFailure(this.toString(), message);
            }

            // publish received records to topicdata
            lockstepProcessingReply.records.forEach((record) => {
              this.topicData.publish(record.topic, record[record.type], record.type);
            });
          })
      );
    });

    Promise.all(processingPromises).then(() => {
      setImmediate(() => {
        this.lockstepProcessingPass();
      });
    });
  }

  addProcessingModule(pm) {
    if (this.runtimeProcessingModules.includes(pm)) {
      namida.logFailure(
        this.toString(),
        "can't add processing module " + pm.name + ', already part of session'
      );
      return false;
    }

    if (!this.processingModuleManager.hasModuleID(pm.id)) {
      this.processingModuleManager.addModule(pm);
    }
    this.runtimeProcessingModules.push(pm);
    return true;
  }

  removeProcessingModuleByID(id) {
    let index = this.runtimeProcessingModules.findIndex((element) => element.id === id);
    if (index !== -1) {
      this.runtimeProcessingModules[index].stop();
      this.runtimeProcessingModules.splice(index, 1);
      return true;
    } else {
      return false;
    }
  }

  removeProcessingModule(pm) {
    return this.removeProcessingModuleByID(pm.id);
  }

  toProtobuf() {
    return {
      id: this.id,
      name: this.name,
      authors: this.authors,
      tags: this.tags,
      description: this.description,
      processingModules: this.processingModules,
      ioMappings: this.ioMappings
    };
  }

  toString() {
    return 'Session ' + this.name + ' (ID ' + this.id + ')';
  }
}

module.exports = { Session };
