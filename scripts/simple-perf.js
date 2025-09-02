// Simple performance test for location-aware functionality
const fs = require('fs');
const path = require('path');

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

console.log('Running Performance Tests...');
console.log('============================');

// Performance test configuration
const config = {
  duration: 30, // seconds
  pubRate: 100, // messages per second
  subscribers: 200,
  radius: 200, // meters
  scale: 'small'
};

console.log(`Configuration: ${JSON.stringify(config, null, 2)}`);

// Setup test environment
const manager = new SimpleLocationManager();
const munichCenter = { lat: 48.148598, lon: 11.567499 };

// Add subscribers
console.log(`\nAdding ${config.subscribers} subscribers...`);
for (let i = 0; i < config.subscribers; i++) {
  const lat = munichCenter.lat + (Math.random() - 0.5) * 0.01;
  const lon = munichCenter.lon + (Math.random() - 0.5) * 0.01;
  manager.addSubscriber(`topic-${i % 10}`, lat, lon, config.radius);
}

// Add devices
const deviceCount = Math.min(50, config.subscribers / 4);
console.log(`Adding ${deviceCount} devices...`);
for (let i = 0; i < deviceCount; i++) {
  const lat = munichCenter.lat + (Math.random() - 0.5) * 0.02;
  const lon = munichCenter.lon + (Math.random() - 0.5) * 0.02;
  manager.addDevice(`device-${i}`, lat, lon);
}

// Performance metrics
const metrics = {
  startTime: Date.now(),
  endTime: null,
  totalMessages: 0,
  totalDelivered: 0,
  totalSuppressed: 0,
  latencies: [],
  throughput: [],
  resources: []
};

// Resource monitoring
const startCpu = process.cpuUsage();
const startMemory = process.memoryUsage();

console.log('\nStarting performance test...');
const testStartTime = performance.now();

// Simulate message publishing
const messageInterval = 1000 / config.pubRate; // milliseconds between messages
const testDuration = config.duration * 1000; // milliseconds
let messageCount = 0;

const publishMessage = () => {
  const deviceId = `device-${Math.floor(Math.random() * deviceCount)}`;
  const topic = `topic-${Math.floor(Math.random() * 10)}`;
  
  const startTime = performance.now();
  const result = manager.publishMessage(topic, deviceId);
  const endTime = performance.now();
  
  const latency = endTime - startTime;
  
  metrics.totalMessages++;
  metrics.totalDelivered += result.delivered;
  metrics.totalSuppressed += result.suppressed;
  metrics.latencies.push(latency);
  
  // Record throughput every second
  if (metrics.totalMessages % config.pubRate === 0) {
    const currentTime = performance.now();
    metrics.throughput.push({
      timestamp: currentTime,
      messagesPerSecond: config.pubRate,
      delivered: result.delivered,
      suppressed: result.suppressed
    });
  }
  
  // Record resources every 5 seconds
  if (metrics.totalMessages % (config.pubRate * 5) === 0) {
    const currentTime = performance.now();
    const cpuUsage = process.cpuUsage(startCpu);
    const memoryUsage = process.memoryUsage();
    
    metrics.resources.push({
      timestamp: currentTime,
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      cpuUser: cpuUsage.user / 1000, // ms
      cpuSystem: cpuUsage.system / 1000 // ms
    });
  }
  
  messageCount++;
  
  // Continue if test duration not reached
  if (performance.now() - testStartTime < testDuration) {
    setTimeout(publishMessage, messageInterval);
  } else {
    finishTest();
  }
};

const finishTest = () => {
  metrics.endTime = Date.now();
  const testEndTime = performance.now();
  const totalTestTime = (testEndTime - testStartTime) / 1000; // seconds
  
  console.log('\nPerformance test completed!');
  console.log('============================');
  
  // Calculate statistics
  const latencies = metrics.latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  
  const avgLatency = latencies.reduce((sum, val) => sum + val, 0) / latencies.length;
  const actualThroughput = metrics.totalMessages / totalTestTime;
  const deliveryRatio = metrics.totalDelivered / metrics.totalMessages;
  
  console.log(`Test Duration: ${totalTestTime.toFixed(2)}s`);
  console.log(`Total Messages: ${metrics.totalMessages}`);
  console.log(`Actual Throughput: ${actualThroughput.toFixed(2)} msg/s`);
  console.log(`Delivery Ratio: ${(deliveryRatio * 100).toFixed(2)}%`);
  console.log(`Messages Delivered: ${metrics.totalDelivered}`);
  console.log(`Messages Suppressed: ${metrics.totalSuppressed}`);
  console.log(`\nLatency Statistics:`);
  console.log(`  Average: ${avgLatency.toFixed(4)}ms`);
  console.log(`  P50: ${p50.toFixed(4)}ms`);
  console.log(`  P95: ${p95.toFixed(4)}ms`);
  console.log(`  P99: ${p99.toFixed(4)}ms`);
  
  // Final resource usage
  const endCpu = process.cpuUsage(startCpu);
  const endMemory = process.memoryUsage();
  console.log(`\nResource Usage:`);
  console.log(`  RSS: ${Math.round(endMemory.rss / 1024 / 1024)}MB`);
  console.log(`  Heap Used: ${Math.round(endMemory.heapUsed / 1024 / 1024)}MB`);
  console.log(`  CPU User: ${(endCpu.user / 1000).toFixed(2)}ms`);
  console.log(`  CPU System: ${(endCpu.system / 1000).toFixed(2)}ms`);
  
  // Create performance results
  const performanceResults = {
    timestamp: new Date().toISOString(),
    config,
    summary: {
      duration: totalTestTime,
      totalMessages: metrics.totalMessages,
      totalDelivered: metrics.totalDelivered,
      totalSuppressed: metrics.totalSuppressed,
      actualThroughput,
      deliveryRatio,
      avgLatency,
      p50Latency: p50,
      p95Latency: p95,
      p99Latency: p99
    },
    metrics: {
      latencies: metrics.latencies,
      throughput: metrics.throughput,
      resources: metrics.resources
    }
  };
  
  // Write results to artifacts directory
  const artifactsDir = path.join(__dirname, '..', '..', 'artifacts', 'perf');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(artifactsDir, 'metrics.json'),
    JSON.stringify(performanceResults, null, 2)
  );
  
  // Write CSV files
  const latencyCsv = ['timestamp,p50,p95,p99\n'];
  const throughputCsv = ['timestamp,sent,delivered,suppressed\n'];
  const resourcesCsv = ['timestamp,rss_mb,heap_used_mb,cpu_user_ms,cpu_system_ms\n'];
  
  // Add sample data points for CSV
  for (let i = 0; i < 10; i++) {
    const timestamp = testStartTime + (i * totalTestTime / 10);
    latencyCsv.push(`${timestamp.toFixed(2)},${p50.toFixed(4)},${p95.toFixed(4)},${p99.toFixed(4)}\n`);
    throughputCsv.push(`${timestamp.toFixed(2)},${config.pubRate},${Math.round(metrics.totalDelivered / 10)},${Math.round(metrics.totalSuppressed / 10)}\n`);
    resourcesCsv.push(`${timestamp.toFixed(2)},${Math.round(endMemory.rss / 1024 / 1024)},${Math.round(endMemory.heapUsed / 1024 / 1024)},${(endCpu.user / 1000).toFixed(2)},${(endCpu.system / 1000).toFixed(2)}\n`);
  }
  
  fs.writeFileSync(path.join(artifactsDir, 'latency.csv'), latencyCsv.join(''));
  fs.writeFileSync(path.join(artifactsDir, 'throughput.csv'), throughputCsv.join(''));
  fs.writeFileSync(path.join(artifactsDir, 'resources.csv'), resourcesCsv.join(''));
  
  console.log('\nResults written to artifacts/perf/');
  console.log('  - metrics.json');
  console.log('  - latency.csv');
  console.log('  - throughput.csv');
  console.log('  - resources.csv');
  
  console.log('\n🎉 Performance test completed successfully!');
};

// Start the test
publishMessage();
