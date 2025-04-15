const DeviceManager = require('../../src/devices/deviceManager');

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
  let componentSpec = {
    name: 'my test component'
  };
  let component = deviceManager.registerComponentSpecs(componentSpec);
  let component2 = deviceManager.registerComponentSpecs(componentSpec);
  expect(component.id).not.toBe(component2.id);
  expect(component.topic).not.toBe(component2.topic);
});
