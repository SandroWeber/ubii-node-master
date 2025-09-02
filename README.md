# UBII Thesis Evaluation Test Harness

A test suite for evaluating the UBII location-aware publish/subscribe system.

## Quick Start

```bash
# Install dependencies
pnpm install

# Run all tests
./test-all.sh
```

## What It Tests

- **Unit Tests**: Haversine distance calculations (18 tests)
- **Integration Tests**: Location-aware message routing (5 scenarios)
- **Performance Tests**: Throughput, latency, resource usage

## Generated Results

After running tests, check the `artifacts/` directory for:
- `unit.json` - Unit test results
- `integration.json` - Integration test results  
- `summary.json` - Overall summary
- `perf/` - Performance metrics and CSV data

## Requirements

- Node.js v18+
- pnpm v8+
- macOS/Linux/Windows

## Individual Commands

```bash
# Unit tests only
cd ubii-node-master && npx jest test/unit/haversine-standalone.test.js

# Performance tests only  
cd ubii-node-master && node scripts/simple-perf.js

# Generate summary
node scripts/summarize-artifacts.cjs
```

## Expected Results

- Unit Tests: 18/18 passed
- Integration Tests: 5/5 passed  
- Performance: ~90 msgs/sec, <1ms latency
