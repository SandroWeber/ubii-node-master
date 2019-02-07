/**
 * Devices are representations of remote entities at the server that interact with the ubii system.
 */
class Device {
    constructor(identifier, client, topicData) {
        if (new.target === Device) {
            throw new TypeError("Cannot construct Device instances directly");
        }

        if (this.deactivate === undefined) {
            throw new TypeError("Must override deactivate");
        }

        this.identifier = identifier;
        this.client = client;
        this.topicData = topicData;
        this.registrationDate = new Date();
        this.lastSignOfLife = null;

        this.updateLastSignOfLife();
    }

    /**
     * Send a message to the corresponding remote client.
     * @param {*} message 
     */
    sendMessageToRemote(message) {
        this.client.sendMessageToRemote(message);
    }

    /**
     * Update the last sign of life with the current date.
     */
    updateLastSignOfLife(){
        this.lastSignOfLife = new Date();
    }

    /**
     * Update all relevant information of this device.
     */
    updateInformation(){
        this.updateLastSignOfLife();
    }
}

module.exports = {
    'Device': Device
}