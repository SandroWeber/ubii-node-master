// Simple integration test runner
const fs = require('fs');
const path = require('path');

// Import the test file
const testFile = require('../test/integration/location-simple.test.js');

console.log('Running Simple Integration Tests...');
console.log('=====================================');

// Run the tests manually
let passed = 0;
let failed = 0;
const results = [];

// Test 1: Munich setup
try {
  console.log('\n1. Testing Munich setup...');
  const manager = new testFile.SimpleLocationManager();
  
  const munichCenter = { lat: 48.148598, lon: 11.567499 };
  
  manager.addDevice('publisher', munichCenter.lat, munichCenter.lon);
  manager.addDevice('nearby1', munichCenter.lat, munichCenter.lon + 0.001);
  manager.addDevice('nearby2', munichCenter.lat, munichCenter.lon + 0.002);
  manager.addDevice('far1', munichCenter.lat + 0.1, munichCenter.lon);
  manager.addDevice('far2', munichCenter.lat + 0.2, munichCenter.lon);
  
  manager.addSubscriber('test-topic', munichCenter.lat, munichCenter.lon, 150);
  manager.addSubscriber('test-topic', munichCenter.lat, munichCenter.lon, 5000);
  
  const result1 = manager.publishMessage('test-topic', 'nearby1');
  const result2 = manager.publishMessage('test-topic', 'nearby2');
  const result3 = manager.publishMessage('test-topic', 'far1');
  const result4 = manager.publishMessage('test-topic', 'far2');
  
  if (result1.delivered === 2 && result1.suppressed === 0 &&
      result2.delivered === 1 && result2.suppressed === 1 &&
      result3.delivered === 1 && result3.suppressed === 1 &&
      result4.delivered === 0 && result4.suppressed === 2) {
    console.log('✅ Munich setup test PASSED');
    passed++;
    results.push({ test: 'Munich setup', status: 'PASSED' });
  } else {
    console.log('❌ Munich setup test FAILED');
    failed++;
    results.push({ test: 'Munich setup', status: 'FAILED' });
  }
} catch (error) {
  console.log('❌ Munich setup test FAILED with error:', error.message);
  failed++;
  results.push({ test: 'Munich setup', status: 'FAILED', error: error.message });
}

// Test 2: Dynamic movement
try {
  console.log('\n2. Testing dynamic movement...');
  const manager = new testFile.SimpleLocationManager();
  
  const subscriber = { lat: 48.148598, lon: 11.567499 };
  manager.addSubscriber('movement-topic', subscriber.lat, subscriber.lon, 200);
  
  let deviceLat = subscriber.lat + 0.01;
  let deviceLon = subscriber.lon;
  
  manager.addDevice('moving-device', deviceLat, deviceLon);
  let result = manager.publishMessage('movement-topic', 'moving-device');
  
  if (result.delivered === 0 && result.suppressed === 1) {
    deviceLat = subscriber.lat + 0.001;
    manager.addDevice('moving-device', deviceLat, deviceLon);
    result = manager.publishMessage('movement-topic', 'moving-device');
    
    if (result.delivered === 1 && result.suppressed === 0) {
      deviceLat = subscriber.lat + 0.01;
      manager.addDevice('moving-device', deviceLat, deviceLon);
      result = manager.publishMessage('movement-topic', 'moving-device');
      
      if (result.delivered === 0 && result.suppressed === 1) {
        console.log('✅ Dynamic movement test PASSED');
        passed++;
        results.push({ test: 'Dynamic movement', status: 'PASSED' });
      } else {
        console.log('❌ Dynamic movement test FAILED');
        failed++;
        results.push({ test: 'Dynamic movement', status: 'FAILED' });
      }
    } else {
      console.log('❌ Dynamic movement test FAILED');
      failed++;
      results.push({ test: 'Dynamic movement', status: 'FAILED' });
    }
  } else {
    console.log('❌ Dynamic movement test FAILED');
    failed++;
    results.push({ test: 'Dynamic movement', status: 'FAILED' });
  }
} catch (error) {
  console.log('❌ Dynamic movement test FAILED with error:', error.message);
  failed++;
  results.push({ test: 'Dynamic movement', status: 'FAILED', error: error.message });
}

// Test 3: Mixed subscriptions
try {
  console.log('\n3. Testing mixed subscriptions...');
  const manager = new testFile.SimpleLocationManager();
  
  const center = { lat: 48.148598, lon: 11.567499 };
  
  manager.addDevice('device1', center.lat, center.lon + 0.001);
  manager.addDevice('device2', center.lat + 0.1, center.lon);
  
  manager.addSubscriber('mixed-topic', center.lat, center.lon, 500);
  manager.addSubscriber('mixed-topic', center.lat, center.lon, 100000);
  
  const result1 = manager.publishMessage('mixed-topic', 'device1');
  const result2 = manager.publishMessage('mixed-topic', 'device2');
  
  if (result1.delivered === 2 && result1.suppressed === 0 &&
      result2.delivered === 1 && result2.suppressed === 1) {
    console.log('✅ Mixed subscriptions test PASSED');
    passed++;
    results.push({ test: 'Mixed subscriptions', status: 'PASSED' });
  } else {
    console.log('❌ Mixed subscriptions test FAILED');
    failed++;
    results.push({ test: 'Mixed subscriptions', status: 'FAILED' });
  }
} catch (error) {
  console.log('❌ Mixed subscriptions test FAILED with error:', error.message);
  failed++;
  results.push({ test: 'Mixed subscriptions', status: 'FAILED', error: error.message });
}

// Test 4: Performance
try {
  console.log('\n4. Testing performance...');
  const manager = new testFile.SimpleLocationManager();
  
  const center = { lat: 48.148598, lon: 11.567499 };
  
  for (let i = 0; i < 10; i++) {
    const lat = center.lat + (Math.random() - 0.5) * 0.01;
    const lon = center.lon + (Math.random() - 0.5) * 0.01;
    manager.addDevice(`device${i}`, lat, lon);
  }
  
  for (let i = 0; i < 5; i++) {
    const lat = center.lat + (Math.random() - 0.5) * 0.005;
    const lon = center.lon + (Math.random() - 0.5) * 0.005;
    manager.addSubscriber(`topic${i}`, lat, lon, 1000 + Math.random() * 2000);
  }
  
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
  
  console.log(`  Total messages: ${iterations}`);
  console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`  Average time per message: ${avgTime.toFixed(4)}ms`);
  
  if (avgTime < 1) {
    console.log('✅ Performance test PASSED');
    passed++;
    results.push({ test: 'Performance', status: 'PASSED', avgTime });
  } else {
    console.log('❌ Performance test FAILED');
    failed++;
    results.push({ test: 'Performance', status: 'FAILED', avgTime });
  }
} catch (error) {
  console.log('❌ Performance test FAILED with error:', error.message);
  failed++;
  results.push({ test: 'Performance', status: 'FAILED', error: error.message });
}

// Test 5: Boundary conditions
try {
  console.log('\n5. Testing boundary conditions...');
  const manager = new testFile.SimpleLocationManager();
  
  const center = { lat: 48.148598, lon: 11.567499 };
  
  manager.addDevice('boundary-device', center.lat, center.lon + 0.001);
  manager.addSubscriber('boundary-topic', center.lat, center.lon, 100);
  
  let result = manager.publishMessage('boundary-topic', 'boundary-device');
  
  if (result.delivered === 1 && result.suppressed === 0) {
    manager.addDevice('outside-device', center.lat, center.lon + 0.0011);
    result = manager.publishMessage('boundary-topic', 'outside-device');
    
    if (result.delivered === 0 && result.suppressed === 1) {
      manager.addDevice('same-location', center.lat, center.lon);
      manager.addSubscriber('zero-topic', center.lat, center.lon, 0);
      result = manager.publishMessage('zero-topic', 'same-location');
      
      if (result.delivered === 1 && result.suppressed === 0) {
        console.log('✅ Boundary conditions test PASSED');
        passed++;
        results.push({ test: 'Boundary conditions', status: 'PASSED' });
      } else {
        console.log('❌ Boundary conditions test FAILED');
        failed++;
        results.push({ test: 'Boundary conditions', status: 'FAILED' });
      }
    } else {
      console.log('❌ Boundary conditions test FAILED');
      failed++;
      results.push({ test: 'Boundary conditions', status: 'FAILED' });
    }
  } else {
    console.log('❌ Boundary conditions test FAILED');
    failed++;
    results.push({ test: 'Boundary conditions', status: 'FAILED' });
  }
} catch (error) {
  console.log('❌ Boundary conditions test FAILED with error:', error.message);
  failed++;
  results.push({ test: 'Boundary conditions', status: 'FAILED', error: error.message });
}

// Summary
console.log('\n=====================================');
console.log('INTEGRATION TEST SUMMARY');
console.log('=====================================');
console.log(`Tests passed: ${passed}`);
console.log(`Tests failed: ${failed}`);
console.log(`Total tests: ${passed + failed}`);

// Create results object for artifacts
const integrationResults = {
  timestamp: new Date().toISOString(),
  summary: {
    total: passed + failed,
    passed,
    failed,
    successRate: (passed / (passed + failed)) * 100
  },
  tests: results
};

// Write results to artifacts directory
const artifactsDir = path.join(__dirname, '..', '..', 'artifacts');
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

fs.writeFileSync(
  path.join(artifactsDir, 'integration.json'),
  JSON.stringify(integrationResults, null, 2)
);

console.log('\nResults written to artifacts/integration.json');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 All integration tests passed!');
}
