const test = require('ava');
const { LocationManager } = require('../../src/location/locationManager');
const coordinates = require('../fixtures/coordinates.json');
const paths = require('../fixtures/paths.json');

test.beforeEach(t => {
  t.context.locationManager = new LocationManager();
});

test('Munich setup: publisher with nearby and far devices', t => {
  const { locationManager } = t.context;
  const scenario = coordinates.test_scenarios.munich_setup;
  const topic = '/sensor/data';
  
  // Setup publisher
  locationManager.updateDeviceLocation(
    scenario.publisher.id,
    scenario.publisher.latitude,
    scenario.publisher.longitude,
    5.0
  );
  
  // Setup nearby devices
  scenario.nearby_devices.forEach(device => {
    locationManager.updateDeviceLocation(
      device.id,
      device.latitude,
      device.longitude,
      5.0
    );
    
    const subscription = {
      topic: topic,
      max_distance: 200.0,
      use_dynamic_location: true,
      fixed_latitude: 0.0,
      fixed_longitude: 0.0,
      client_id: device.id
    };
    locationManager.addSubscription(subscription);
  });
  
  // Setup far devices
  scenario.far_devices.forEach(device => {
    locationManager.updateDeviceLocation(
      device.id,
      device.latitude,
      device.longitude,
      5.0
    );
    
    const subscription = {
      topic: topic,
      max_distance: 200.0,
      use_dynamic_location: true,
      fixed_latitude: 0.0,
      fixed_longitude: 0.0,
      client_id: device.id
    };
    locationManager.addSubscription(subscription);
  });
  
  // Test filtering
  const subscribersInRange = locationManager.getSubscribersInRange(topic, scenario.publisher.id);
  
  // All nearby devices should be included
  scenario.nearby_devices.forEach(device => {
    t.true(subscribersInRange.includes(device.id), `${device.id} should be included`);
  });
  
  // All far devices should be excluded
  scenario.far_devices.forEach(device => {
    t.false(subscribersInRange.includes(device.id), `${device.id} should be excluded`);
  });
  
  t.is(subscribersInRange.length, scenario.nearby_devices.length);
});

test('Munich setup: fixed location subscribers', t => {
  const { locationManager } = t.context;
  const scenario = coordinates.test_scenarios.munich_setup;
  const topic = '/sensor/data';
  
  // Setup publisher
  locationManager.updateDeviceLocation(
    scenario.publisher.id,
    scenario.publisher.latitude,
    scenario.publisher.longitude,
    5.0
  );
  
  // Setup fixed subscribers
  scenario.fixed_subscribers.forEach(subscriber => {
    const subscription = {
      topic: topic,
      max_distance: subscriber.max_distance,
      use_dynamic_location: false,
      fixed_latitude: subscriber.latitude,
      fixed_longitude: subscriber.longitude,
      client_id: subscriber.id
    };
    locationManager.addSubscription(subscription);
  });
  
  // Test filtering
  const subscribersInRange = locationManager.getSubscribersInRange(topic, scenario.publisher.id);
  
  // fixed-sub-1 should be included (50m max, 50m away)
  t.true(subscribersInRange.includes('fixed-sub-1'));
  
  // fixed-sub-2 should be included (200m max, 100m away)
  t.true(subscribersInRange.includes('fixed-sub-2'));
  
  // fixed-sub-3 should be excluded (200m max, 8km away)
  t.false(subscribersInRange.includes('fixed-sub-3'));
  
  t.is(subscribersInRange.length, 2);
});

test('Movement scenario: approach', t => {
  const { locationManager } = t.context;
  const scenario = paths.movement_scenarios.approach;
  const topic = '/sensor/data';
  const deviceId = 'approaching-device';
  
  // Setup publisher at Munich center
  locationManager.updateDeviceLocation('publisher', 48.148598, 11.567499, 5.0);
  
  // Setup subscription with 150m range
  const subscription = {
    topic: topic,
    max_distance: 150.0,
    use_dynamic_location: true,
    fixed_latitude: 0.0,
    fixed_longitude: 0.0,
    client_id: deviceId
  };
  locationManager.addSubscription(subscription);
  
  // Test each step in the path
  scenario.path.forEach((step, index) => {
    locationManager.updateDeviceLocation(deviceId, step.latitude, step.longitude, 5.0);
    const subscribersInRange = locationManager.getSubscribersInRange(topic, 'publisher');
    
    if (step.expected_included) {
      t.true(subscribersInRange.includes(deviceId), 
        `Step ${index}: Device should be included at distance ${step.distance}m`);
    } else {
      t.false(subscribersInRange.includes(deviceId), 
        `Step ${index}: Device should be excluded at distance ${step.distance}m`);
    }
  });
});

test('Movement scenario: leave', t => {
  const { locationManager } = t.context;
  const scenario = paths.movement_scenarios.leave;
  const topic = '/sensor/data';
  const deviceId = 'leaving-device';
  
  // Setup publisher at Munich center
  locationManager.updateDeviceLocation('publisher', 48.148598, 11.567499, 5.0);
  
  // Setup subscription with 150m range
  const subscription = {
    topic: topic,
    max_distance: 150.0,
    use_dynamic_location: true,
    fixed_latitude: 0.0,
    fixed_longitude: 0.0,
    client_id: deviceId
  };
  locationManager.addSubscription(subscription);
  
  // Test each step in the path
  scenario.path.forEach((step, index) => {
    locationManager.updateDeviceLocation(deviceId, step.latitude, step.longitude, 5.0);
    const subscribersInRange = locationManager.getSubscribersInRange(topic, 'publisher');
    
    if (step.expected_included) {
      t.true(subscribersInRange.includes(deviceId), 
        `Step ${index}: Device should be included at distance ${step.distance}m`);
    } else {
      t.false(subscribersInRange.includes(deviceId), 
        `Step ${index}: Device should be excluded at distance ${step.distance}m`);
    }
  });
});

test('Movement scenario: oscillate', t => {
  const { locationManager } = t.context;
  const scenario = paths.movement_scenarios.oscillate;
  const topic = '/sensor/data';
  const deviceId = 'oscillating-device';
  
  // Setup publisher at Munich center
  locationManager.updateDeviceLocation('publisher', 48.148598, 11.567499, 5.0);
  
  // Setup subscription with 150m range
  const subscription = {
    topic: topic,
    max_distance: 150.0,
    use_dynamic_location: true,
    fixed_latitude: 0.0,
    fixed_longitude: 0.0,
    client_id: deviceId
  };
  locationManager.addSubscription(subscription);
  
  // Test each step in the path
  scenario.path.forEach((step, index) => {
    locationManager.updateDeviceLocation(deviceId, step.latitude, step.longitude, 5.0);
    const subscribersInRange = locationManager.getSubscribersInRange(topic, 'publisher');
    
    if (step.expected_included) {
      t.true(subscribersInRange.includes(deviceId), 
        `Step ${index}: Device should be included at distance ${step.distance}m`);
    } else {
      t.false(subscribersInRange.includes(deviceId), 
        `Step ${index}: Device should be excluded at distance ${step.distance}m`);
    }
  });
});

test('Mixed topic and location-aware subscriptions', t => {
  const { locationManager } = t.context;
  const topic = '/sensor/data';
  
  // Setup publisher
  locationManager.updateDeviceLocation('publisher', 48.148598, 11.567499, 5.0);
  
  // Setup mixed subscriptions
  const subscriptions = [
    // Location-aware subscriber within range
    {
      topic: topic,
      max_distance: 200.0,
      use_dynamic_location: true,
      fixed_latitude: 0.0,
      fixed_longitude: 0.0,
      client_id: 'location-aware-near'
    },
    // Location-aware subscriber outside range
    {
      topic: topic,
      max_distance: 200.0,
      use_dynamic_location: true,
      fixed_latitude: 0.0,
      fixed_longitude: 0.0,
      client_id: 'location-aware-far'
    },
    // Fixed location subscriber within range
    {
      topic: topic,
      max_distance: 200.0,
      use_dynamic_location: false,
      fixed_latitude: 48.148598,
      fixed_longitude: 11.568499,
      client_id: 'fixed-near'
    },
    // Fixed location subscriber outside range
    {
      topic: topic,
      max_distance: 200.0,
      use_dynamic_location: false,
      fixed_latitude: 48.218598,
      fixed_longitude: 11.567499,
      client_id: 'fixed-far'
    }
  ];
  
  // Add subscriptions
  subscriptions.forEach(sub => locationManager.addSubscription(sub));
  
  // Update dynamic subscriber locations
  locationManager.updateDeviceLocation('location-aware-near', 48.148598, 11.568499, 5.0); // ~100m away
  locationManager.updateDeviceLocation('location-aware-far', 48.218598, 11.567499, 5.0); // ~8km away
  
  // Test filtering
  const subscribersInRange = locationManager.getSubscribersInRange(topic, 'publisher');
  
  // Should include location-aware and fixed subscribers within range
  t.true(subscribersInRange.includes('location-aware-near'));
  t.true(subscribersInRange.includes('fixed-near'));
  
  // Should exclude location-aware and fixed subscribers outside range
  t.false(subscribersInRange.includes('location-aware-far'));
  t.false(subscribersInRange.includes('fixed-far'));
  
  t.is(subscribersInRange.length, 2);
});

test('Multiple topics with different location constraints', t => {
  const { locationManager } = t.context;
  
  // Setup publisher
  locationManager.updateDeviceLocation('publisher', 48.148598, 11.567499, 5.0);
  
  // Setup subscribers for different topics
  const subscriptions = [
    // Topic 1: 100m range
    {
      topic: '/sensor/temperature',
      max_distance: 100.0,
      use_dynamic_location: true,
      fixed_latitude: 0.0,
      fixed_longitude: 0.0,
      client_id: 'temp-subscriber'
    },
    // Topic 2: 500m range
    {
      topic: '/sensor/humidity',
      max_distance: 500.0,
      use_dynamic_location: true,
      fixed_latitude: 0.0,
      fixed_longitude: 0.0,
      client_id: 'humidity-subscriber'
    },
    // Topic 3: 1000m range
    {
      topic: '/camera/feed',
      max_distance: 1000.0,
      use_dynamic_location: true,
      fixed_latitude: 0.0,
      fixed_longitude: 0.0,
      client_id: 'camera-subscriber'
    }
  ];
  
  // Add subscriptions
  subscriptions.forEach(sub => locationManager.addSubscription(sub));
  
  // Position subscriber at 300m distance
  locationManager.updateDeviceLocation('temp-subscriber', 48.151598, 11.567499, 5.0); // ~300m away
  locationManager.updateDeviceLocation('humidity-subscriber', 48.151598, 11.567499, 5.0); // ~300m away
  locationManager.updateDeviceLocation('camera-subscriber', 48.151598, 11.567499, 5.0); // ~300m away
  
  // Test filtering for each topic
  const tempSubscribers = locationManager.getSubscribersInRange('/sensor/temperature', 'publisher');
  const humiditySubscribers = locationManager.getSubscribersInRange('/sensor/humidity', 'publisher');
  const cameraSubscribers = locationManager.getSubscribersInRange('/camera/feed', 'publisher');
  
  // Temperature subscriber should be excluded (300m > 100m)
  t.false(tempSubscribers.includes('temp-subscriber'));
  t.is(tempSubscribers.length, 0);
  
  // Humidity subscriber should be included (300m < 500m)
  t.true(humiditySubscribers.includes('humidity-subscriber'));
  t.is(humiditySubscribers.length, 1);
  
  // Camera subscriber should be included (300m < 1000m)
  t.true(cameraSubscribers.includes('camera-subscriber'));
  t.is(cameraSubscribers.length, 1);
});

test('Performance: high-frequency location updates', t => {
  const { locationManager } = t.context;
  const topic = '/sensor/data';
  const deviceId = 'high-freq-device';
  
  // Setup publisher
  locationManager.updateDeviceLocation('publisher', 48.148598, 11.567499, 5.0);
  
  // Setup subscription
  const subscription = {
    topic: topic,
    max_distance: 200.0,
    use_dynamic_location: true,
    fixed_latitude: 0.0,
    fixed_longitude: 0.0,
    client_id: deviceId
  };
  locationManager.addSubscription(subscription);
  
  const startTime = performance.now();
  const numUpdates = 1000;
  let includedCount = 0;
  
  // Simulate high-frequency updates
  for (let i = 0; i < numUpdates; i++) {
    // Random position within 500m radius
    const angle = (i / numUpdates) * 2 * Math.PI;
    const distance = 100 + Math.sin(angle) * 150; // Oscillate between 100m and 250m
    const lat = 48.148598 + (distance * Math.cos(angle)) / 111000; // Convert to lat
    const lon = 11.567499 + (distance * Math.sin(angle)) / (111000 * Math.cos(48.148598 * Math.PI / 180));
    
    locationManager.updateDeviceLocation(deviceId, lat, lon, 5.0);
    const subscribersInRange = locationManager.getSubscribersInRange(topic, 'publisher');
    
    if (subscribersInRange.includes(deviceId)) {
      includedCount++;
    }
  }
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / numUpdates;
  
  console.log(`High-frequency performance:`);
  console.log(`  Total updates: ${numUpdates}`);
  console.log(`  Included count: ${includedCount}`);
  console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`  Average time per update: ${avgTime.toFixed(4)}ms`);
  
  // Performance should be reasonable (< 1ms per update)
  t.true(avgTime < 1.0, `Average time per update should be < 1ms, got ${avgTime.toFixed(4)}ms`);
  
  // Should have some inclusions and exclusions
  t.true(includedCount > 0, 'Should have some inclusions');
  t.true(includedCount < numUpdates, 'Should have some exclusions');
});
