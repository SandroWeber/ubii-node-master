const { v4: uuidv4 } = require('uuid');
const { LoggingService } = require('@tum-far/ubii-node-nodejs');

const Component = require('./component');

const logger = LoggingService.instance.logger;

/**
 * Devices are representations of remote entities at the server that interact with the ubii system.
 */
class Device {
  static LOG_TAG = '[UBII Device]';

  constructor(specs, client) {
    if (new.target === Device) {
      throw new TypeError('Cannot construct Device instances directly');
    }

    specs && Object.assign(this, specs);
    this.id = uuidv4();
    this.components = [];
    specs.components &&
      specs.components.forEach((spec) => {
        spec.deviceId = this.id;
        this.components.push(new Component(spec, client));
      });
  }

  addComponent(component) {
    if (!component.id || !component.topic) {
      logger.warn(Device.LOG_TAG + ' ' + this.toString() + ' - trying to add component without id or topic');
      logger.warn(component);
      return;
    }

    if (component.deviceId !== this.id) {
      logger.warn(Device.LOG_TAG + ' ' + this.toString() + ' - trying to add component that already has a device ID assigned');
      logger.warn(component);
      return;
    }

    if (
      this.components.some(
        (existingComponent) => existingComponent.id === component.id || existingComponent.topic === component.topic
      )
    ) {
      logger.warn(
        Device.LOG_TAG +
          ' ' +
          this.toString() +
          ' - trying to add component but list already contains component with identical id or topic'
      );
      logger.warn(component);
      return;
    }

    this.components.push(component);
    component.deviceId = this.id;
  }

  removeComponent(component) {
    this.components = this.components.filter((existingComponent) => existingComponent.id !== component.id);
  }

  toProtobuf() {
    return {
      id: this.id,
      name: this.name,
      tags: this.tags,
      deviceType: this.deviceType,
      components: this.components.map((component) => component.toProtobuf()),
      clientId: this.clientId
    };
  }

  toString() {
    return this.name + '(ID ' + this.id + ')';
  }
}

module.exports = Device;
