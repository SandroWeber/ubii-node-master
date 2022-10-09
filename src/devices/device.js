const { v4: uuidv4 } = require('uuid');

const Component = require('./component');

/**
 * Devices are representations of remote entities at the server that interact with the ubii system.
 */
class Device {
  constructor(specs, client) {
    if (new.target === Device) {
      throw new TypeError('Cannot construct Device instances directly');
    }

    specs && Object.assign(this, specs);
    this.id = uuidv4();
    this.components = [];
    specs.components && specs.components.forEach((spec) => {
      this.components.push(new Component(spec, client));
    });

    this.client = client;
  }

  toProtobuf() {
    return {
      id: this.id,
      name: this.name,
      tags: this.tags,
      deviceType: this.deviceType,
      components: this.components.map(component => component.toProtobuf()),
      clientId: this.clientId
    };
  }
}

module.exports = {
  Device: Device
};
