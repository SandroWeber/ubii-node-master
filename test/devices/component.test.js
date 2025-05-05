const Component = require('../../src/devices/component');

test('constructor', () => {
  let componentSpec = {
    id: 'does not matter as it will be overwritten',
    name: 'my test component'
  };
  let component = new Component(componentSpec);
  expect(component.id).not.toBe('does not matter as it will be overwritten');
  expect(component.topic).toBeDefined();
  expect(typeof component.topic).toBe('string');
});

test('hasNotifyConditions()', () => {
  let componentSpec = {
    id: 'does not matter as it will be overwritten',
    name: 'my test component'
  };
  let component = new Component(componentSpec);
  expect(component.hasNotifyConditions()).toBe(false);
});
