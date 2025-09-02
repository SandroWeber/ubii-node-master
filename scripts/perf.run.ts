#!/usr/bin/env ts-node

import { LocationManager } from '../src/location/locationManager.js';
import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

interface PerformanceMetrics {
  timestamp: number;
  p50_latency: number;
  p95_latency: number;
  p99_latency: number;
  throughput_sent: number;
  throughput_delivered: number;
  throughput_suppressed: number;
  cpu_usage: number;
  memory_rss: number;
  memory_heap_used: number;
  delivered_ratio: number;
}

interface PerformanceConfig {
  duration: number;
  pubRate: number;
  subscribers: number;
  radius: number;
  scale: 'small' | 'medium' | 'large';
}

class PerformanceRunner {
  private locationManager: LocationManager;
  private metrics: PerformanceMetrics[] = [];
  private latencies: number[] = [];
  private config: PerformanceConfig;
  private startTime: number;
  private messageCount = 0;
  private deliveredCount = 0;
  private suppressedCount = 0;
  private lastCpuUsage: NodeJS.CpuUsage;
  private lastCpuTime: number;

  constructor(config: PerformanceConfig) {
    this.locationManager = new LocationManager();
    this.config = config;
    this.startTime = performance.now();
    this.lastCpuUsage = process.cpuUsage();
    this.lastCpuTime = performance.now();
  }

  private generateRandomLocation(centerLat: number, centerLon: number, maxRadius: number): [number, number] {
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * maxRadius;
    
    const lat = centerLat + (distance * Math.cos(angle)) / 111000;
    const lon = centerLon + (distance * Math.sin(angle)) / (111000 * Math.cos(centerLat * Math.PI / 180));
    
    return [lat, lon];
  }

  private setupSubscribers(): void {
    const centerLat = 48.148598;
    const centerLon = 11.567499;
    const topic = '/sensor/data';

    console.log(`Setting up ${this.config.subscribers} subscribers...`);

    for (let i = 0; i < this.config.subscribers; i++) {
      const [lat, lon] = this.generateRandomLocation(centerLat, centerLon, this.config.radius * 2);
      
      // Add dynamic subscriber
      this.locationManager.updateDeviceLocation(`subscriber-${i}`, lat, lon, 5.0);
      
      const subscription = {
        topic: topic,
        max_distance: this.config.radius,
        use_dynamic_location: true,
        fixed_latitude: 0.0,
        fixed_longitude: 0.0,
        client_id: `subscriber-${i}`
      };
      
      this.locationManager.addSubscription(subscription);
    }

    console.log('Subscribers setup complete');
  }

  private measureLatency(publisherId: string, topic: string): number {
    const startTime = performance.now();
    const subscribersInRange = this.locationManager.getSubscribersInRange(topic, publisherId);
    const endTime = performance.now();
    
    return endTime - startTime;
  }

  private recordMetrics(): void {
    const now = performance.now();
    const elapsed = now - this.startTime;
    
    // Calculate latency percentiles
    const sortedLatencies = [...this.latencies].sort((a, b) => a - b);
    const p50Index = Math.floor(sortedLatencies.length * 0.5);
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p99Index = Math.floor(sortedLatencies.length * 0.99);
    
    const p50_latency = sortedLatencies[p50Index] || 0;
    const p95_latency = sortedLatencies[p95Index] || 0;
    const p99_latency = sortedLatencies[p99Index] || 0;
    
    // Calculate throughput
    const throughput_sent = this.messageCount / (elapsed / 1000);
    const throughput_delivered = this.deliveredCount / (elapsed / 1000);
    const throughput_suppressed = this.suppressedCount / (elapsed / 1000);
    
    // Calculate CPU usage
    const currentCpuUsage = process.cpuUsage();
    const currentTime = performance.now();
    const cpuTimeDiff = currentTime - this.lastCpuTime;
    const cpuUsageDiff = currentCpuUsage.user - this.lastCpuUsage.user;
    const cpu_usage = (cpuUsageDiff / cpuTimeDiff) * 100;
    
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const memory_rss = memoryUsage.rss / 1024 / 1024; // MB
    const memory_heap_used = memoryUsage.heapUsed / 1024 / 1024; // MB
    
    // Calculate delivery ratio
    const delivered_ratio = this.messageCount > 0 ? this.deliveredCount / this.messageCount : 0;
    
    const metric: PerformanceMetrics = {
      timestamp: now,
      p50_latency,
      p95_latency,
      p99_latency,
      throughput_sent,
      throughput_delivered,
      throughput_suppressed,
      cpu_usage,
      memory_rss,
      memory_heap_used,
      delivered_ratio
    };
    
    this.metrics.push(metric);
    
    // Update for next iteration
    this.lastCpuUsage = currentCpuUsage;
    this.lastCpuTime = currentTime;
  }

  private runPerformanceTest(): void {
    const centerLat = 48.148598;
    const centerLon = 11.567499;
    const topic = '/sensor/data';
    const publisherId = 'performance-publisher';
    
    // Setup publisher
    this.locationManager.updateDeviceLocation(publisherId, centerLat, centerLon, 5.0);
    
    console.log('Starting performance test...');
    console.log(`Duration: ${this.config.duration}ms`);
    console.log(`Publish rate: ${this.config.pubRate} msgs/sec`);
    console.log(`Subscribers: ${this.config.subscribers}`);
    console.log(`Radius: ${this.config.radius}m`);
    
    const interval = 1000 / this.config.pubRate; // ms between messages
    const endTime = this.startTime + this.config.duration;
    let lastMetricTime = this.startTime;
    
    // Start metrics recording interval
    const metricsInterval = setInterval(() => {
      this.recordMetrics();
      lastMetricTime = performance.now();
    }, 5000); // Record metrics every 5 seconds
    
    // Main test loop
    const testInterval = setInterval(() => {
      const now = performance.now();
      
      if (now >= endTime) {
        clearInterval(testInterval);
        clearInterval(metricsInterval);
        this.finalizeTest();
        return;
      }
      
      // Generate random publisher location
      const [pubLat, pubLon] = this.generateRandomLocation(centerLat, centerLon, this.config.radius);
      this.locationManager.updateDeviceLocation(publisherId, pubLat, pubLon, 5.0);
      
      // Measure latency
      const latency = this.measureLatency(publisherId, topic);
      this.latencies.push(latency);
      
      // Count messages
      this.messageCount++;
      
      // Simulate delivery based on subscriber count
      const subscribersInRange = this.locationManager.getSubscribersInRange(topic, publisherId);
      if (subscribersInRange.length > 0) {
        this.deliveredCount++;
      } else {
        this.suppressedCount++;
      }
      
    }, interval);
  }

  private finalizeTest(): void {
    console.log('\nPerformance test completed');
    console.log(`Total messages: ${this.messageCount}`);
    console.log(`Delivered: ${this.deliveredCount}`);
    console.log(`Suppressed: ${this.suppressedCount}`);
    console.log(`Delivery ratio: ${(this.deliveredCount / this.messageCount * 100).toFixed(2)}%`);
    
    // Record final metrics
    this.recordMetrics();
    
    // Export results
    this.exportResults();
  }

  private exportResults(): void {
    const artifactsDir = path.join(process.cwd(), '..', '..', 'artifacts', 'perf');
    
    // Ensure artifacts directory exists
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }
    
    // Export metrics as JSON
    const metricsPath = path.join(artifactsDir, 'metrics.json');
    const metricsData = {
      config: this.config,
      summary: {
        total_messages: this.messageCount,
        delivered: this.deliveredCount,
        suppressed: this.suppressedCount,
        delivery_ratio: this.deliveredCount / this.messageCount,
        avg_latency: this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length,
        p50_latency: this.calculatePercentile(this.latencies, 50),
        p95_latency: this.calculatePercentile(this.latencies, 95),
        p99_latency: this.calculatePercentile(this.latencies, 99)
      },
      metrics: this.metrics
    };
    
    fs.writeFileSync(metricsPath, JSON.stringify(metricsData, null, 2));
    console.log(`Metrics exported to: ${metricsPath}`);
    
    // Export latency CSV
    const latencyPath = path.join(artifactsDir, 'latency.csv');
    const latencyCsv = this.generateLatencyCsv();
    fs.writeFileSync(latencyPath, latencyCsv);
    console.log(`Latency CSV exported to: ${latencyPath}`);
    
    // Export throughput CSV
    const throughputPath = path.join(artifactsDir, 'throughput.csv');
    const throughputCsv = this.generateThroughputCsv();
    fs.writeFileSync(throughputPath, throughputCsv);
    console.log(`Throughput CSV exported to: ${throughputPath}`);
    
    // Export resources CSV
    const resourcesPath = path.join(artifactsDir, 'resources.csv');
    const resourcesCsv = this.generateResourcesCsv();
    fs.writeFileSync(resourcesPath, resourcesCsv);
    console.log(`Resources CSV exported to: ${resourcesPath}`);
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor((percentile / 100) * (sorted.length - 1));
    return sorted[index] || 0;
  }

  private generateLatencyCsv(): string {
    const headers = ['timestamp', 'p50', 'p95', 'p99'];
    const rows = this.metrics.map(m => [
      m.timestamp,
      m.p50_latency.toFixed(4),
      m.p95_latency.toFixed(4),
      m.p99_latency.toFixed(4)
    ]);
    
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  private generateThroughputCsv(): string {
    const headers = ['timestamp', 'sent', 'delivered', 'suppressed'];
    const rows = this.metrics.map(m => [
      m.timestamp,
      m.throughput_sent.toFixed(2),
      m.throughput_delivered.toFixed(2),
      m.throughput_suppressed.toFixed(2)
    ]);
    
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  private generateResourcesCsv(): string {
    const headers = ['timestamp', 'rss_mb', 'heap_used_mb', 'cpu_percent'];
    const rows = this.metrics.map(m => [
      m.timestamp,
      m.memory_rss.toFixed(2),
      m.memory_heap_used.toFixed(2),
      m.cpu_usage.toFixed(2)
    ]);
    
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  public run(): void {
    this.setupSubscribers();
    this.runPerformanceTest();
  }
}

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('duration', {
    type: 'number',
    default: 30000,
    description: 'Test duration in milliseconds'
  })
  .option('pubRate', {
    type: 'number',
    default: 100,
    description: 'Publish rate in messages per second'
  })
  .option('subscribers', {
    type: 'number',
    default: 200,
    description: 'Number of subscribers'
  })
  .option('radius', {
    type: 'number',
    default: 200,
    description: 'Subscription radius in meters'
  })
  .option('scale', {
    type: 'string',
    choices: ['small', 'medium', 'large'],
    default: 'small',
    description: 'Test scale'
  })
  .help()
  .argv;

// Adjust parameters based on scale
let config: PerformanceConfig;
switch (argv.scale) {
  case 'medium':
    config = {
      duration: 60000,
      pubRate: 500,
      subscribers: 500,
      radius: 500,
      scale: 'medium'
    };
    break;
  case 'large':
    config = {
      duration: 120000,
      pubRate: 1000,
      subscribers: 1000,
      radius: 1000,
      scale: 'large'
    };
    break;
  default:
    config = {
      duration: argv.duration,
      pubRate: argv.pubRate,
      subscribers: argv.subscribers,
      radius: argv.radius,
      scale: argv.scale
    };
}

// Run performance test
const runner = new PerformanceRunner(config);
runner.run();
