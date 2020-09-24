const uuidv4 = require('uuid/v4');

const { proto } = require('@tum-far/ubii-msg-formats');
const SessionStatus = proto.ubii.sessions.SessionStatus;

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
    this.lockstepProcessingModules = [];
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
        let pm = this.processingModuleManager.getModuleByID(pmSpecs.id);
        if (!pm) {
          pm = this.processingModuleManager.createModule(pmSpecs);
        }
        if (pm) {
          this.runtimeProcessingModules.push(pm);
          if (pm.processingMode && pm.processingMode.lockstep) {
            this.lockstepProcessingModules.push(pm);
          }
        } else {
          namida.logFailure(
            this.toString(),
            'could not instantiate processing module ' + pmSpecs.name
          );
        }
      }
    }

    this.processingModuleManager.applyIOMappings(this.ioMappings);

    this.runtimeProcessingModules.forEach((pm) => {
      pm.start();
    });
    this.tLastLockstepPass = Date.now();

    return true;
  }

  stop() {
    if (this.status !== SessionStatus.RUNNING) {
      return false;
    }

    this.status = SessionStatus.STOPPED;

    for (let processingModule of this.runtimeProcessingModules) {
      processingModule.stop();
    }

    this.runtimeProcessingModules = [];
    this.lockstepProcessingModules = [];

    return true;
  }

  async lockstepProcessingPass() {
    // timing
    let tNow = Date.now();
    let deltaTime = tNow - tLastProcess;
    this.tLastLockstepPass = tNow;

    // gather inputs
    let lockstepProcessingRequests = [];
    this.lockstepProcessingModules.forEach((pm) => {
      let lockstepProcessingRequest = {
        records: [],
        deltaTimeMs: deltaTime
      };
      let inputMappings = this.ioMappings.find((element) => element.processingModuleId === pm.id)
        .inputMappings;
      if (inputMappings) {
        pm.inputs.forEach((input) => {
          let inputMapping = inputMappings.find(
            (element) => element.inputName === input.internalName
          );
          // single topic input
          if (typeof topicSource === 'string') {
            let topicdataEntry = this.topicData.pull(topicSource);
            let record = { topic: topicSource, data: topicdataEntry.data };
            record.type = topicdataEntry.type;
            record[entry.type] = topicdataEntry.data;
            lockstepProcessingRequest.records.push(record);
          }
          // topic muxer input
          else if (typeof topicSource === 'object') {
            let records = this.deviceManager.getTopicMux(topicSource.id).get();
            lockstepProcessingRequest.records.push(...records);
          }
        });
      }

      lockstepProcessingRequests.push({
        processingModule: pm,
        request: lockstepProcessingRequest
      });
    });

    console.info(lockstepProcessingRequests);

    // send out lockstepProcessingRequests
    let processingPromises = [];
    await Promise.all(processingPromises);
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
