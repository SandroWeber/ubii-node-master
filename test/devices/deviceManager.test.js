const DeviceManager = require('../../src/devices/deviceManager');
/*const MasterNode = require('../../src/node/masterNode');
jest.mock('../../src/node/masterNode');*/

/*beforeEach(() => {
  MasterNode.mockClear();
});*/

test('getAllComponents()', () => {
  let deviceManager = new DeviceManager();
  let componentSpec = {
    name: 'my test component'
  };
  deviceManager.registerComponentSpecs(componentSpec);
  expect(deviceManager.getAllComponents().length).toBe(1);
  deviceManager.registerComponentSpecs(componentSpec);
  deviceManager.registerComponentSpecs(componentSpec);
  expect(deviceManager.getAllComponents().length).toBe(3);
});

test('registerComponentSpecs()', () => {
  let deviceManager = new DeviceManager();
  let componentSpec = {
    name: 'my test component'
  };
  let component = deviceManager.registerComponentSpecs(componentSpec);
  let component2 = deviceManager.registerComponentSpecs(componentSpec);
  expect(component.id).not.toBe(component2.id);
  expect(component.topic).not.toBe(component2.topic);
});

test('registerComponentSpecs() - existing topic', () => {
  let deviceManager = new DeviceManager();
  let componentSpec = {
    name: 'my test component'
  };
  let component = deviceManager.registerComponentSpecs(componentSpec);
  expect(deviceManager.registerComponentSpecs({ topic: component.topic })).not.toBeDefined();
  expect(deviceManager.getAllComponents().length).toBe(1);
});

test('registerComponentSpecs() - existing id', () => {
  let deviceManager = new DeviceManager();
  let componentSpec = {
    name: 'my test component'
  };
  let component = deviceManager.registerComponentSpecs(componentSpec);
  expect(deviceManager.registerComponentSpecs({ id: component.id })).not.toBeDefined();
  expect(deviceManager.getAllComponents().length).toBe(1);
});

test('registerDeviceSpecs()', () => {
  let deviceManager = new DeviceManager();
  let deviceSpec = {
    name: 'my test component'
  };
  let device = deviceManager.registerDeviceSpecs(deviceSpec);
  let device2 = deviceManager.registerDeviceSpecs(deviceSpec);
  expect(device.id).not.toBe(device2.id);
});

test('registerDeviceSpecs() - existing id', () => {
  let deviceManager = new DeviceManager();
  let deviceSpec = {
    name: 'my test component'
  };
  let device = deviceManager.registerDeviceSpecs(deviceSpec);
  expect(deviceManager.registerDeviceSpecs({ id: device.id })).toThrow();
  expect(deviceManager.getAllDevices().length).toBe(1);
});

test('DeviceManager.EVENTS.NEW_DEVICE', () => {
  let deviceManager = new DeviceManager();
  let eventCallback = jest.fn();
  deviceManager.on(DeviceManager.EVENTS.NEW_DEVICE, eventCallback);
  deviceManager.emit(DeviceManager.EVENTS.NEW_DEVICE, {});
  expect(eventCallback).toHaveBeenCalled();
});
