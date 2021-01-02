const uuidv4 = require('uuid/v4');
const { proto } = require('@tum-far/ubii-msg-formats');
const SessionStatus = proto.ubii.sessions.SessionStatus;
const ProcessingModuleStatus = proto.ubii.processing.ProcessingModule.Status;
const namida = require('@tum-far/namida');

const ProcessingModuleManager = require('../processing/processingModuleManager');

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
    masterNodeID,
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
    this.processingModules = processingModules || [];
    this.ioMappings = ioMappings;

    this.masterNodeID = masterNodeID;
    this.topicData = topicData;
    this.deviceManager = deviceManager;
    this.processingModuleManager = processingModuleManager;

    this.lockstepPMs = new Map();
    this.localPMs = [];
    this.remotePMs = new Map();

    this.initialize();
  }

  initialize() {
    // setup for processing modules
    for (let pmSpec of this.processingModules) {
      pmSpec.sessionId = this.id;
      // if PM isn't assigned to run on a particular node, run here
      //TODO: check if dedicated processing nodes are available to run it (requires load balancing and communication)
      if (!pmSpec.nodeId) pmSpec.nodeId = this.masterNodeID;

      // should PM run on this node?
      if (pmSpec.nodeId === this.masterNodeID) {
        let pm = this.processingModuleManager.getModuleBySpecs(pmSpec, this.id);
        if (!pm) {
          pm = this.processingModuleManager.createModule(pmSpec);
        }
        if (pm) {
          pmSpec.id = pm.id;
          this.localPMs.push(pmSpec);
        } else {
          namida.logFailure(
            this.toString(),
            'could not instantiate processing module ' + pmSpec.name
          );
          return false;
        }
      }
      //PM should run on a different node, group PMs by node ID they're running on
      else {
        if (!this.remotePMs.has(pmSpec.nodeId)) {
          this.remotePMs.set(pmSpec.nodeId, []);
        }
        pmSpec.id = uuidv4(); // assign ID to PM spec before starting remotely
        this.remotePMs.get(pmSpec.nodeId).push(pmSpec);
      }

      // gather PMs running in lockstep, group PMs by node ID they're running on
      if (pmSpec.processingMode && pmSpec.processingMode.lockstep) {
        if (!this.lockstepPMs.has(pmSpec.nodeId)) {
          this.lockstepPMs.set(pmSpec.nodeId, []);
        }
        this.lockstepPMs.get(pmSpec.nodeId).push(pmSpec);
      }
    }
    console.info('remoteProcessingModules');
    console.info(this.remotePMs);

    if (this.remotePMs.size > 0) {
      this.processingModuleManager.addListener(
        ProcessingModuleManager.EVENTS.PM_STARTED,
        this.onProcessingModuleStarted
      );
    }

    // filter out I/O mappings for PMs that run on this node and apply
    let applicableIOMappings = this.ioMappings.filter((ioMapping) =>
      this.processingModules.find(
        (pm) =>
          pm.nodeId === this.masterNodeID &&
          (pm.name === ioMapping.processingModuleName || pm.id === ioMapping.processingModuleId)
      )
    );
    if (applicableIOMappings.length > 0) {
      this.processingModuleManager.applyIOMappings(applicableIOMappings, this.id);
    }
  }

  start() {
    if (this.status === SessionStatus.RUNNING) {
      namida.logFailure('Session ' + this.id, "can't be started again, already processing");
      return false;
    }

    if (!this.processingModules || this.processingModules.length === 0) {
      namida.logFailure('Session ' + this.id, 'session has no processing modules to start');
      return false;
    }

    this.status = SessionStatus.RUNNING;

    // start processing modules
    this.localPMs.forEach((pm) => {
      this.processingModuleManager.getModuleByID(pm.id).start();
    });
    this.pmAwaitingRemoteStart = [];
    this.remotePMs.forEach((pm) => {
      this.pmAwaitingRemoteStart.push(pm);
    });

    // start lockstep cycles
    this.tLastLockstepPass = Date.now();
    this.lockstepProcessingPass();

    return true;
  }

  stop() {
    if (this.status !== SessionStatus.RUNNING) {
      return false;
    }

    this.status = SessionStatus.STOPPED;

    if (this.remotePMs.size > 0) {
      this.processingModuleManager.removeListener(
        ProcessingModuleManager.EVENTS.PM_STARTED,
        this.onProcessingModuleStarted
      );
    }

    for (let processingModule of this.localPMs) {
      this.processingModuleManager.getModuleByID(processingModule.id).stop();
    }

    this.lockstepPMs = new Map();
    this.localPMs = [];
    this.remotePMs = new Map();

    return true;
  }

  onProcessingModuleStarted(remotePMSpec) {
    console.info('session onProcessingModuleStarted');
    console.info(remotePMSpec);

    let index = this.pmAwaitingRemoteStart.findIndex(
      (pm) => pm.sessionId === this.id && pm.id === remotePMSpec.id
    );
    if (index !== -1) {
      this.pmAwaitingRemoteStart.splice(index, 1);
    }
    console.info(this.pmAwaitingRemoteStart);
  }

  lockstepProcessingPass() {
    // timing
    let tNow = Date.now();
    let deltaTime = tNow - this.tLastLockstepPass;
    this.tLastLockstepPass = tNow;

    // gather inputs
    let processingPromises = [];
    this.lockstepPMs.forEach((pms, clientID) => {
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
