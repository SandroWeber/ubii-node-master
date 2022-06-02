const { v4: uuidv4 } = require('uuid');

/**
 * Devices are representations of remote entities at the server that interact with the ubii system.
 */
class Device {
  constructor(specs, client) {
    if (new.target === Device) {
      throw new TypeError("Cannot construct Device instances directly");
    }

    if (this.deactivate === undefined) {
      throw new TypeError("Must override deactivate");
    }

    specs && Object.assign(this, specs);

    this.id = this.id ? this.id : uuidv4();
    this.components.forEach(component => {
      component.id = uuidv4();
    });

    this.client = client;
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
  updateLastSignOfLife() {
    this.lastSignOfLife = new Date();
  }

  /**
   * Update all relevant information of this device.
   */
  updateInformation() {
    this.updateLastSignOfLife();
  }

  toProtobuf() {
    return {
      id: this.id,
      name: this.name,
      tags: this.tags,
      deviceType: this.deviceType,
      components: this.components,
      clientId: this.clientId
    };
  }
}

module.exports = {
  'Device': Device
}