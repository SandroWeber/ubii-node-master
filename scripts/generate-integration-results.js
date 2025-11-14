#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Run AVA tests and capture output
try {
  console.log('Running integration tests...');
  const output = execSync('npx ava --verbose', { 
    encoding: 'utf8',
    cwd: __dirname + '/..'
  });
  
  // Parse test results
  const lines = output.split('\n');
  let passed = 0;
  let failed = 0;
  let total = 0;
  
  for (const line of lines) {
    if (line.includes('passed')) {
      passed++;
      total++;
    } else if (line.includes('failed')) {
      failed++;
      total++;
    }
  }
  
  // Create results object
  const results = {
    timestamp: new Date().toISOString(),
    passed,
    failed,
    total,
    success: failed === 0,
    output: output
  };
  
  // Ensure artifacts directory exists
  const artifactsDir = path.join(__dirname, '..', '..', 'artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }
  
  // Write results
  const resultsPath = path.join(artifactsDir, 'integration.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  
  console.log(`Integration tests completed: ${passed}/${total} passed`);
  console.log(`Results saved to: ${resultsPath}`);
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
  
} catch (error) {
  console.error('Integration tests failed:', error.message);
  
  // Create error results
  const results = {
    timestamp: new Date().toISOString(),
    passed: 0,
    failed: 1,
    total: 1,
    success: false,
    error: error.message
  };
  
  // Ensure artifacts directory exists
  const artifactsDir = path.join(__dirname, '..', '..', 'artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }
  
  // Write error results
  const resultsPath = path.join(artifactsDir, 'integration.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  
  console.log(`Error results saved to: ${resultsPath}`);
  process.exit(1);
}
