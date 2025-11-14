// Simple integration test for location-aware functionality
// This test simulates basic location-aware scenarios without complex dependencies

const test = require('ava');

// Simple location-aware subscription system
class SimpleLocationManager {
  constructor() {
    this.subscribers = new Map();
    this.devices = new Map();
  }

  addDevice(id, lat, lon) {
    this.devices.set(id, { lat, lon });
  }

  addSubscriber(topic, lat, lon, maxDistance) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
    }
    this.subscribers.get(topic).push({
      lat, lon, maxDistance,
      delivered: 0,
      suppressed: 0
    });
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  publishMessage(topic, deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) return { delivered: 0, suppressed: 0 };

    const subscribers = this.subscribers.get(topic) || [];
    let delivered = 0;
    let suppressed = 0;

    subscribers.forEach(sub => {
      const distance = this.calculateDistance(
        device.lat, device.lon,
        sub.lat, sub.lon
      );

      if (distance <= sub.maxDistance) {
        sub.delivered++;
        delivered++;
      } else {
        sub.suppressed++;
        suppressed++;
      }
    });

    return { delivered, suppressed };
  }

  getStats() {
    const stats = {
      totalDelivered: 0,
      totalSuppressed: 0,
      subscribers: []
    };

    for (const [topic, subs] of this.subscribers) {
      subs.forEach(sub => {
        stats.totalDelivered += sub.delivered;
        stats.totalSuppressed += sub.suppressed;
        stats.subscribers.push({
          topic,
          delivered: sub.delivered,
          suppressed: sub.suppressed
        });
      });
    }

    return stats;
  }
}

// Export the class for use in other files
module.exports = { SimpleLocationManager };

test('Munich setup: Publisher with nearby and far devices', (t) => {
  const manager = new SimpleLocationManager();
  
  // Munich center coordinates
  const munichCenter = { lat: 48.148598, lon: 11.567499 };
  
  // Add devices at different distances
  manager.addDevice('publisher', munichCenter.lat, munichCenter.lon);
  manager.addDevice('nearby1', munichCenter.lat, munichCenter.lon + 0.001); // ~100m
  manager.addDevice('nearby2', munichCenter.lat, munichCenter.lon + 0.002); // ~200m
  manager.addDevice('far1', munichCenter.lat + 0.1, munichCenter.lon); // ~11km
  manager.addDevice('far2', munichCenter.lat + 0.2, munichCenter.lon); // ~22km
  
  // Add subscribers with different radius
  manager.addSubscriber('test-topic', munichCenter.lat, munichCenter.lon, 150); // 150m radius
  manager.addSubscriber('test-topic', munichCenter.lat, munichCenter.lon, 5000); // 5km radius
  
  // Test message delivery
  const result1 = manager.publishMessage('test-topic', 'nearby1');
  const result2 = manager.publishMessage('test-topic', 'nearby2');
  const result3 = manager.publishMessage('test-topic', 'far1');
  const result4 = manager.publishMessage('test-topic', 'far2');
  
  // Verify results
  t.is(result1.delivered, 2); // Both subscribers should receive (within 150m and 5km)
  t.is(result1.suppressed, 0);
  
  t.is(result2.delivered, 1); // Only 5km subscriber should receive (200m > 150m)
  t.is(result2.suppressed, 1);
  
  t.is(result3.delivered, 1); // Only 5km subscriber should receive
  t.is(result3.suppressed, 1);
  
  t.is(result4.delivered, 0); // Neither subscriber should receive (22km > 5km)
  t.is(result4.suppressed, 2);
  
  const stats = manager.getStats();
  t.is(stats.totalDelivered, 4);
  t.is(stats.totalSuppressed, 4);
});

test('Dynamic movement: Device approaching and leaving', (t) => {
  const manager = new SimpleLocationManager();
  
  // Fixed subscriber at Munich center
  const subscriber = { lat: 48.148598, lon: 11.567499 };
  manager.addSubscriber('movement-topic', subscriber.lat, subscriber.lon, 200); // 200m radius
  
  // Device starting far away
  let deviceLat = subscriber.lat + 0.01; // ~1.1km away
  let deviceLon = subscriber.lon;
  
  // Initial state - should be suppressed
  manager.addDevice('moving-device', deviceLat, deviceLon);
  let result = manager.publishMessage('movement-topic', 'moving-device');
  t.is(result.delivered, 0);
  t.is(result.suppressed, 1);
  
  // Move closer (within 200m)
  deviceLat = subscriber.lat + 0.001; // ~100m away
  manager.addDevice('moving-device', deviceLat, deviceLon);
  result = manager.publishMessage('movement-topic', 'moving-device');
  t.is(result.delivered, 1);
  t.is(result.suppressed, 0);
  
  // Move away again
  deviceLat = subscriber.lat + 0.01; // ~1.1km away
  manager.addDevice('moving-device', deviceLat, deviceLon);
  result = manager.publishMessage('movement-topic', 'moving-device');
  t.is(result.delivered, 0);
  t.is(result.suppressed, 1);
});

test('Mixed topic and location-aware subscriptions', (t) => {
  const manager = new SimpleLocationManager();
  
  const center = { lat: 48.148598, lon: 11.567499 };
  
  // Add devices
  manager.addDevice('device1', center.lat, center.lon + 0.001); // ~100m
  manager.addDevice('device2', center.lat + 0.1, center.lon); // ~11km
  
  // Add location-aware subscriber
  manager.addSubscriber('mixed-topic', center.lat, center.lon, 500); // 500m radius
  
  // Simulate topic-only subscriber (no location filtering)
  // For this test, we'll add another subscriber with very large radius
  manager.addSubscriber('mixed-topic', center.lat, center.lon, 100000); // 100km radius
  
  // Test message delivery
  const result1 = manager.publishMessage('mixed-topic', 'device1');
  const result2 = manager.publishMessage('mixed-topic', 'device2');
  
  // Both devices should be delivered to the 100km subscriber
  // Only device1 should be delivered to the 500m subscriber
  t.is(result1.delivered, 2); // Both subscribers
  t.is(result1.suppressed, 0);
  
  t.is(result2.delivered, 1); // Only 100km subscriber
  t.is(result2.suppressed, 1); // 500m subscriber suppresses
});

test('High-frequency updates performance', (t) => {
  const manager = new SimpleLocationManager();
  
  const center = { lat: 48.148598, lon: 11.567499 };
  
  // Add multiple devices
  for (let i = 0; i < 10; i++) {
    const lat = center.lat + (Math.random() - 0.5) * 0.01;
    const lon = center.lon + (Math.random() - 0.5) * 0.01;
    manager.addDevice(`device${i}`, lat, lon);
  }
  
  // Add multiple subscribers
  for (let i = 0; i < 5; i++) {
    const lat = center.lat + (Math.random() - 0.5) * 0.005;
    const lon = center.lon + (Math.random() - 0.5) * 0.005;
    manager.addSubscriber(`topic${i}`, lat, lon, 1000 + Math.random() * 2000);
  }
  
  // Simulate high-frequency updates
  const startTime = performance.now();
  const iterations = 1000;
  
  for (let i = 0; i < iterations; i++) {
    const deviceId = `device${i % 10}`;
    const topic = `topic${i % 5}`;
    manager.publishMessage(topic, deviceId);
  }
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;
  
  console.log(`High-frequency test:`);
  console.log(`  Total messages: ${iterations}`);
  console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`  Average time per message: ${avgTime.toFixed(4)}ms`);
  
  // Performance should be very fast (< 1ms per message)
  t.true(avgTime < 1);
  
  const stats = manager.getStats();
  t.true(stats.totalDelivered > 0);
  t.true(stats.totalSuppressed > 0);
});

test('Boundary conditions and edge cases', (t) => {
  const manager = new SimpleLocationManager();
  
  const center = { lat: 48.148598, lon: 11.567499 };
  
  // Test exact boundary
  manager.addDevice('boundary-device', center.lat, center.lon + 0.001); // ~100m
  manager.addSubscriber('boundary-topic', center.lat, center.lon, 100); // Exactly 100m
  
  let result = manager.publishMessage('boundary-topic', 'boundary-device');
  t.is(result.delivered, 1); // Should be delivered (exactly at boundary)
  t.is(result.suppressed, 0);
  
  // Test just outside boundary
  manager.addDevice('outside-device', center.lat, center.lon + 0.0011); // ~110m
  result = manager.publishMessage('boundary-topic', 'outside-device');
  t.is(result.delivered, 0); // Should be suppressed
  t.is(result.suppressed, 1);
  
  // Test zero distance
  manager.addDevice('same-location', center.lat, center.lon);
  manager.addSubscriber('zero-topic', center.lat, center.lon, 0);
  result = manager.publishMessage('zero-topic', 'same-location');
  t.is(result.delivered, 1); // Should be delivered (zero distance)
  t.is(result.suppressed, 0);
});
