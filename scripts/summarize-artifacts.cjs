#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log(`Warning: Could not read ${filePath}: ${error.message}`);
    return null;
  }
}

function calculateSummary(unitData, integrationData, perfData) {
  const summary = {
    timestamp: new Date().toISOString(),
    overallStatus: 'PASS',
    unitTests: { passed: 0, total: 0, successRate: 0 },
    integrationTests: { passed: 0, total: 0, successRate: 0 },
    performance: {
      avgLatency: 0,
      p95Latency: 0,
      throughput: 0,
      deliveryRatio: 0,
      cpuUsage: 0,
      memoryUsage: 0
    },
    recommendations: []
  };

  // Parse unit test results (Jest format)
  if (unitData) {
    summary.unitTests.passed = unitData.numPassedTests || 0;
    summary.unitTests.total = unitData.numTotalTests || 0;
    summary.unitTests.successRate = summary.unitTests.total > 0 
      ? (summary.unitTests.passed / summary.unitTests.total) * 100 
      : 0;
    
    if (summary.unitTests.successRate < 100) {
      summary.overallStatus = 'FAIL';
      summary.recommendations.push('Unit tests have failures - review test results');
    }
  }

  // Parse integration test results
  if (integrationData) {
    summary.integrationTests.passed = integrationData.summary?.passed || 0;
    summary.integrationTests.total = integrationData.summary?.total || 0;
    summary.integrationTests.successRate = integrationData.summary?.successRate || 0;
    
    if (summary.integrationTests.successRate < 100) {
      summary.overallStatus = 'FAIL';
      summary.recommendations.push('Integration tests have failures - check system integration');
    }
  }

  // Parse performance test results
  if (perfData) {
    const perfSummary = perfData.summary;
    if (perfSummary) {
      summary.performance.avgLatency = perfSummary.avgLatency || 0;
      summary.performance.p95Latency = perfSummary.p95Latency || 0;
      summary.performance.throughput = perfSummary.actualThroughput || 0;
      summary.performance.deliveryRatio = (perfSummary.deliveryRatio || 0) * 100;
      
      // Calculate resource usage from the last resource entry
      if (perfData.metrics && perfData.metrics.resources && perfData.metrics.resources.length > 0) {
        const lastResource = perfData.metrics.resources[perfData.metrics.resources.length - 1];
        summary.performance.memoryUsage = lastResource.rss || 0;
        summary.performance.cpuUsage = ((lastResource.cpuUser + lastResource.cpuSystem) / (perfSummary.duration * 1000)) * 100;
      }
    }
    
    // Performance recommendations
    if (summary.performance.deliveryRatio < 80) {
      summary.recommendations.push('Low delivery ratio - check subscription filtering');
    }
    if (summary.performance.avgLatency > 1) {
      summary.recommendations.push('High latency detected - optimize distance calculations');
    }
    if (summary.performance.throughput < 50) {
      summary.recommendations.push('Low throughput - consider performance optimizations');
    }
  }

  // Overall recommendations
  if (summary.recommendations.length === 0) {
    summary.recommendations.push('All systems operating within expected parameters');
  }

  return summary;
}

function printSummary(summary) {
  console.log('');
  console.log('='.repeat(80));
  console.log('UBII THESIS EVALUATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`Generated: ${summary.timestamp}`);
  console.log(`Overall Status: ${summary.overallStatus}`);
  console.log('');

  console.log('📊 TEST RESULTS');
  console.log('-'.repeat(40));
  console.log(`Unit Tests: ${summary.unitTests.passed}/${summary.unitTests.total} passed (${summary.unitTests.successRate.toFixed(1)}%)`);
  console.log(`Integration Tests: ${summary.integrationTests.passed}/${summary.integrationTests.total} passed (${summary.integrationTests.successRate.toFixed(1)}%)`);
  console.log(`Performance Tests: ${summary.performance.avgLatency > 0 ? 'PASS' : 'N/A'}`);
  console.log('');

  console.log('⚡ PERFORMANCE METRICS');
  console.log('-'.repeat(40));
  console.log(`Average Latency: ${summary.performance.avgLatency.toFixed(4)}ms`);
  console.log(`P95 Latency: ${summary.performance.p95Latency.toFixed(4)}ms`);
  console.log(`Throughput: ${summary.performance.throughput.toFixed(2)} msgs/sec`);
  console.log(`Delivery Ratio: ${summary.performance.deliveryRatio.toFixed(1)}%`);
  console.log(`CPU Usage: ${summary.performance.cpuUsage.toFixed(1)}%`);
  console.log(`Memory Usage: ${summary.performance.memoryUsage.toFixed(1)}MB`);
  console.log('');

  console.log('💡 RECOMMENDATIONS');
  console.log('-'.repeat(40));
  summary.recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });
  console.log('');

  console.log('📁 ARTIFACTS LOCATION');
  console.log('-'.repeat(40));
  console.log('• Unit test results: artifacts/unit.json');
  console.log('• Integration test results: artifacts/integration.json');
  console.log('• Performance metrics: artifacts/perf/metrics.json');
  console.log('• Latency data: artifacts/perf/latency.csv');
  console.log('• Throughput data: artifacts/perf/throughput.csv');
  console.log('• Resource usage: artifacts/perf/resources.csv');
  console.log('');

  console.log('='.repeat(80));
}

function main() {
  const artifactsDir = path.join(__dirname, '..', 'artifacts');
  
  // Read test result files
  const unitData = readJsonFile(path.join(artifactsDir, 'unit.json'));
  const integrationData = readJsonFile(path.join(artifactsDir, 'integration.json'));
  const perfData = readJsonFile(path.join(artifactsDir, 'perf', 'metrics.json'));

  // Calculate summary
  const summary = calculateSummary(unitData, integrationData, perfData);

  // Print summary
  printSummary(summary);

  // Save summary to file
  const summaryPath = path.join(artifactsDir, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`Summary saved to: ${summaryPath}`);
}

main();

