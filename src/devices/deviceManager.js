const {
    Participant
} = require('./../devices/participant.js');
const {
    Watcher
} = require('./../devices/watcher.js');
const uuidv4 = require("uuid/v4");
const namida = require('@tum-far/namida');

const REJECT_REGISTRATION_FEEDBBACK_TITLE = 'Device registration rejected';
const ACCEPT_REGISTRATION_FEEDBACK_TITLE = 'Device registration accepted';

/**
 * The DeviceManager manages Device objects. It is part of a server node.
 * The server node uses it to manages all entities that interact with the functionalities of the server.
 */
class DeviceManager {
    constructor(clientManager, topicData, server) {
        this.clientManager  = clientManager;
        this.topicData      = topicData;
        this.server         = server;
        this.participants   = new Map();
        this.watchers       = new Map();

        namida.log('Device Manager Ready','The Device Manager is initialized and ready to work.');
    }

    // Participants utilities:

    /**
     * Get the participant with the specified identifier.
     * @param {String} deviceIdentifier Universally unique identifier of a Device.
     * @returns Device object with the specified identifier.
     */
    getParticipant(deviceIdentifier) {
        return this.participants.get(deviceIdentifier);
    }

    /**
     * Is there a participant with the specified identifier in the participants map?
     * @param {String} deviceIdentifier Universally unique identifier of a Device.
     * @returns Boolean indicating if there is a participant with the specified identifier.
     */
    hasParticipant(deviceIdentifier) {
        return this.participants.has(deviceIdentifier);
    }

    /**
     * Add the specified participant to the participants map.
     * @param {Object} participant 
     */
    addParticipant(participant) {
        this.participants.set(participant.identifier, participant);
    }

    /**
     * Remove the participant with the specified identiier from the participants map.
     * @param {String} deviceIdentifier Universally unique identifier of a Device.
     */
    removeParticipant(deviceIdentifier) {
        this.getParticipant(deviceIdentifier).deactivate();
        this.participants.delete(deviceIdentifier);
    }

    /**
     * Register the passed device as participant and initializes the behavior of the participant.
     * @param {Object} device 
     */
    registerParticipant(device){
        // Register the participant.
        this.addParticipant(device);      
    }

    /**
     * Verify the specified participant.
     * @param {String} deviceIdentifier Universally unique identifier of a Device.
     * @returns Returns true if the specified client is a verfied client, returns false otherwise.
     */
    verifyParticipant(deviceIdentifier){
        if(!this.hasParticipant(deviceIdentifier)){
           return false;
       }else{
           return true;
       }
    }

    // Watchers utilities:

    /**
     * Get the watcher with the specified identifier.
     * @param {String} deviceIdentifier Universally unique identifier of a Device.
     * @returns Watcher object with the specified identifier.
     */
    getWatcher(deviceIdentifier) {
        return this.watchers.get(deviceIdentifier);
    }

    /**
     * Is there a watcher with the specified identifier in the watchers map?
     * @param {String} deviceIdentifier Universally unique identifier of a Device.
     * @returns Boolean indicating if there is a watcher with the specified identifier.
     */
    hasWatcher(deviceIdentifier) {
        return this.watchers.has(deviceIdentifier);
    }

    /**
     * Add the specified watcher to the watchers map.
     * @param {Object} watcher 
     */
    addWatcher(watcher) {
        this.watchers.set(watcher.identifier, watcher);
    }

    /**
     * Remove the watcher with the specified id from the watchers map.
     * @param {String} deviceIdentifier Universally unique identifier of a Device.
     */
    removeWatcher(deviceIdentifier) {
        this.getWatcher(deviceIdentifier).deactivate();
        this.watchers.delete(deviceIdentifier);
    }

    /**
     * Register the passed device as watcher and initializes the behavior of the watcher.
     * @param {Object} device 
     */
    registerWatcher(device) {
        // Register the watcher.
        this.addWatcher( device);  

        // Initially introduce all topics currently available in the topic data to new watchers.
        device.introduceTopicDataToRemote();

        // Subscribe the watcher to all current and future topics.
        // (because watchers should get notified about any changes in the topic data)
        device.subscribeAll();
    }

    /**
     * Verify the specified watcher.
     * @param {String} deviceIdentifier Universally unique identifier of a Device.
     * @returns Returns true if the specified device is a verfied watcher, returns false otherwise.
     */
    verifyWatcher(deviceIdentifier){
        if(!this.hasWatcher(deviceIdentifier)){
            return false;
        }else{
            return true;
        }
    }

    // General:

    /**
     * Creates and returns a new Universally Unique Identifier (UUID).
     * @returns {String} The newly created Universally Unique Identifier (UUID).
     */
    createDeviceUuid(){
        return uuidv4();
    }

    /**
     * Create a new device specification with the passed parameters and a new Universally Unique Identifier (UUID) as identifier.
     * @param {String} name 
     * @param {String} namespace 
     * @param {*} deviceType The type of the device. See the ubii-msg-formats repository for more information.
     * @param {String} correspondingClientIdentifier Universally unique identifier of the corresponding Client.
     */
    createDeviceSpecificationWithNewUuid(name, namespace,  deviceType, correspondingClientIdentifier){
        return {
            name: name,
            namespace: namespace,
            identifier: this.createDeviceUuid(),
            deviceType: deviceType,
            correspondingClientIdentifier: correspondingClientIdentifier
        };
    }

    // Message and request process methods:

    /**
     * Process the registration of the specified device at the device manager.
     * @param {Object} deviceSpecification 
     * @param {*} context 
     * @returns Returns the payload of the process result. This can be the device specification or an error.
     */
    processDeviceRegistration(deviceSpecification, context) {
        // Prepare some variables.
        let payload = {};
        let currentDevice = {};
        let deviceIdentifier = deviceSpecification.identifier;
        let clientIdentifier = deviceSpecification.correspondingClientIdentifier;

        // Check the context.
        if(context.feedback === undefined){
            context.feedback = {};
        }

        // Update the feedback to the default registartion feedback.
        context.feedback.message = `New Device with id ${namida.style.messageHighlight(deviceIdentifier)} registered.`;
        context.feedback.title = ACCEPT_REGISTRATION_FEEDBACK_TITLE;

        // Check if the device is already registered as participant...
        if (this.hasParticipant(deviceIdentifier)) {
            // ... if so, check the state of the registered client if reregistering is possible.
            if(this.clientManager.getClient(clientIdentifier).registrationDate < this.getParticipant(deviceIdentifier).lastSignOfLife
                || deviceSpecification.deviceType !== 'PARTICIPANT'){
                // -> REregistering is not an option: Reject the registration.

                // Update the context feedback.
                context.feedback.message = `The Device with id ${namida.style.messageHighlight(deviceIdentifier)} ` +
                `is already registered as participant.`;
                context.feedback.title = REJECT_REGISTRATION_FEEDBBACK_TITLE;

                // Ouput the feedback on the server console.
                namida.logFailure(context.feedback.title, context.feedback.message);

                // Return an error message payload.
                payload = {
                    error: {
                        title: context.feedback.title,
                        message: context.feedback.message,
                        stack: context.feedback.stack
                    }
                };
                return payload
            }else{
                // -> REregistering is possible: Prepare the registration.

                // Update the context feedback.
                context.feedback.message = `Reregistration of Participant with id ${namida.style.messageHighlight(deviceIdentifier)} ` +
                    `initialized because it is already registered but the corresponding client was reregistered since ` +
                    `the last sign of life of this device.`;
                context.feedback.title = ACCEPT_REGISTRATION_FEEDBACK_TITLE;
                
                // Ouput the feedback on the server console.
                namida.logWarn(context.feedback.title, context.feedback.message);
                
                // Prepare the reregistration.
                this.removeParticipant(deviceIdentifier);

                // Update the feedback.
                context.feedback.message = `Participant with id ${namida.style.messageHighlight(deviceIdentifier)} reregistered.`;
                context.feedback.title = ACCEPT_REGISTRATION_FEEDBACK_TITLE;

                // Continue with the normal registration process...
            }
        }

        // ... or watcher.
        if (this.hasWatcher(deviceIdentifier)) {
            // ... if so, check the state of the registered client if reregistering is possible.
            if(this.clientManager.getClient(clientIdentifier).registrationDate < this.getWatcher(deviceIdentifier).lastSignOfLife
                || deviceSpecification.deviceType !== 'WATCHER'){
                // -> REregistering is not an option: Reject the registration.

                // Update the context feedback.
                context.feedback.message = `The Device with id ${namida.style.messageHighlight(deviceIdentifier)} ` +
                `is already registered as watcher.`;
                context.feedback.title = REJECT_REGISTRATION_FEEDBBACK_TITLE;

                // Ouput the feedback on the server console.
                namida.logFailure(context.feedback.title, context.feedback.message);

                // Return an error message payload.
                payload = {
                    error: {
                        title: context.feedback.title,
                        message: context.feedback.message,
                        stack: context.feedback.stack
                    }
                };
                return payload
            }else{
                // -> REregistering is possible: Prepare the registration.

                // Update the context feedback.
                context.feedback.message = `Reregistration of Watcher with id ${namida.style.messageHighlight(deviceIdentifier)} ` +
                    `initialized because it is already registered but the corresponding client was reregistered since ` +
                    `the last sign of life of this device.`;
                context.feedback.title = ACCEPT_REGISTRATION_FEEDBACK_TITLE;
                
                // Ouput the feedback on the server console.
                namida.logWarn(context.feedback.title, context.feedback.message);
                
                // Prepare the reregistration.
                this.removeParticipant(deviceIdentifier);

                // Update the feedback.
                context.feedback.message = `Watcher with id ${namida.style.messageHighlight(clientIdentifier)} reregistered.`;
                context.feedback.title = ACCEPT_REGISTRATION_FEEDBACK_TITLE;

                // Continue with the normal registration process...
            }
        }

        // Handle the registration of a participant.
        if(deviceSpecification.deviceType === 0){
            currentDevice = new Participant(deviceIdentifier, 
                deviceSpecification.correspondingClientIdentifier, 
                this.topicData, 
                this.server);
            this.registerParticipant(currentDevice);
        }

        // Handle the registration of a watcher.
        if(deviceSpecification.deviceType === 1){
            currentDevice = new Watcher(deviceIdentifier,
                deviceSpecification.correspondingClientIdentifier,
                this.topicData,
                this.server);
            this.registerWatcher(currentDevice);
        }

        // Ouput the feedback on the server console.
        namida.logSuccess(context.feedback.title, context.feedback.message);

        // Update the device information.
        currentDevice.updateInformation();

        // Prepare the deviceSpecification TODO: Fix this hack
        deviceSpecification.deviceType = deviceSpecification.deviceType.toString();

        // Return the deviceSpecification payload.
        payload = {
            deviceSpecification: deviceSpecification
        };
        return payload;
    }
}

module.exports = {
    'DeviceManager': DeviceManager,
}