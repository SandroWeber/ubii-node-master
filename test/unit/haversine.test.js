const { LocationManager } = require('../../src/location/locationManager');

describe('Haversine Distance Calculation', () => {
  let locationManager;

  beforeEach(() => {
    locationManager = new LocationManager();
  });

  // Test cases with known distances (using Vincenty formula as reference)
  const testCases = [
    // Short distances (0-100m)
    {
      name: 'Short distance - 50m',
      lat1: 48.148598, lon1: 11.567499,
      lat2: 48.148598, lon2: 11.567999,
      expectedDistance: 50,
      tolerance: 1
    },
    {
      name: 'Short distance - 100m',
      lat1: 48.148598, lon1: 11.567499,
      lat2: 48.148598, lon2: 11.568499,
      expectedDistance: 100,
      tolerance: 1
    },
    // Medium distances (100m-10km)
    {
      name: 'Medium distance - 1km',
      lat1: 48.148598, lon1: 11.567499,
      lat2: 48.157598, lon2: 11.567499,
      expectedDistance: 1000,
      tolerance: 5
    },
    {
      name: 'Medium distance - 5km',
      lat1: 48.148598, lon1: 11.567499,
      lat2: 48.198598, lon2: 11.567499,
      expectedDistance: 5000,
      tolerance: 25
    },
    // Long distances (10km-500km)
    {
      name: 'Long distance - 100km',
      lat1: 48.148598, lon1: 11.567499,
      lat2: 49.148598, lon2: 11.567499,
      expectedDistance: 100000,
      tolerance: 300
    },
    {
      name: 'Long distance - 500km',
      lat1: 48.148598, lon1: 11.567499,
      lat2: 52.148598, lon2: 11.567499,
      expectedDistance: 500000,
      tolerance: 1500
    }
  ];

  // Edge cases
  const edgeCases = [
    {
      name: 'Same point',
      lat1: 48.148598, lon1: 11.567499,
      lat2: 48.148598, lon2: 11.567499,
      expectedDistance: 0,
      tolerance: 0.1
    },
    {
      name: 'North Pole',
      lat1: 90.0, lon1: 0.0,
      lat2: 89.0, lon2: 0.0,
      expectedDistance: 111194,
      tolerance: 500
    },
    {
      name: 'South Pole',
      lat1: -90.0, lon1: 0.0,
      lat2: -89.0, lon2: 0.0,
      expectedDistance: 111194,
      tolerance: 500
    },
    {
      name: 'International Date Line',
      lat1: 48.148598, lon1: 179.9,
      lat2: 48.148598, lon2: -179.9,
      expectedDistance: 200,
      tolerance: 10
    },
    {
      name: 'Equator crossing',
      lat1: 0.1, lon1: 11.567499,
      lat2: -0.1, lon2: 11.567499,
      expectedDistance: 22239,
      tolerance: 100
    }
  ];

  // Munich-specific test cases
  const munichCases = [
    {
      name: 'Munich to nearby point - 100m',
      lat1: 48.148598, lon1: 11.567499,
      lat2: 48.148598, lon2: 11.568499,
      expectedDistance: 100,
      tolerance: 1
    },
    {
      name: 'Munich to nearby point - 200m',
      lat1: 48.148598, lon1: 11.567499,
      lat2: 48.148598, lon2: 11.569499,
      expectedDistance: 200,
      tolerance: 2
    },
    {
      name: 'Munich to far point - 8km',
      lat1: 48.148598, lon1: 11.567499,
      lat2: 48.218598, lon2: 11.567499,
      expectedDistance: 8000,
      tolerance: 40
    }
  ];

  describe('Standard distance calculations', () => {
    testCases.forEach(testCase => {
      test(testCase.name, () => {
        const distance = locationManager.calculateDistance(
          testCase.lat1, testCase.lon1,
          testCase.lat2, testCase.lon2
        );
        
        const error = Math.abs(distance - testCase.expectedDistance);
        const errorPercentage = (error / testCase.expectedDistance) * 100;
        
        expect(distance).toBeGreaterThan(0);
        expect(error).toBeLessThanOrEqual(testCase.tolerance);
        
        // Log detailed results for analysis
        console.log(`${testCase.name}:`);
        console.log(`  Expected: ${testCase.expectedDistance}m`);
        console.log(`  Calculated: ${distance.toFixed(2)}m`);
        console.log(`  Error: ${error.toFixed(2)}m (${errorPercentage.toFixed(3)}%)`);
      });
    });
  });

  describe('Edge cases', () => {
    edgeCases.forEach(testCase => {
      test(testCase.name, () => {
        const distance = locationManager.calculateDistance(
          testCase.lat1, testCase.lon1,
          testCase.lat2, testCase.lon2
        );
        
        const error = Math.abs(distance - testCase.expectedDistance);
        
        expect(distance).toBeGreaterThanOrEqual(0);
        expect(error).toBeLessThanOrEqual(testCase.tolerance);
        
        console.log(`${testCase.name}:`);
        console.log(`  Expected: ${testCase.expectedDistance}m`);
        console.log(`  Calculated: ${distance.toFixed(2)}m`);
        console.log(`  Error: ${error.toFixed(2)}m`);
      });
    });
  });

  describe('Munich-specific scenarios', () => {
    munichCases.forEach(testCase => {
      test(testCase.name, () => {
        const distance = locationManager.calculateDistance(
          testCase.lat1, testCase.lon1,
          testCase.lat2, testCase.lon2
        );
        
        const error = Math.abs(distance - testCase.expectedDistance);
        
        expect(distance).toBeGreaterThan(0);
        expect(error).toBeLessThanOrEqual(testCase.tolerance);
        
        console.log(`${testCase.name}:`);
        console.log(`  Expected: ${testCase.expectedDistance}m`);
        console.log(`  Calculated: ${distance.toFixed(2)}m`);
        console.log(`  Error: ${error.toFixed(2)}m`);
      });
    });
  });

  describe('Accuracy validation', () => {
    test('Short distances should have ±1m accuracy', () => {
      const shortDistances = testCases.filter(tc => tc.expectedDistance <= 100);
      shortDistances.forEach(testCase => {
        const distance = locationManager.calculateDistance(
          testCase.lat1, testCase.lon1,
          testCase.lat2, testCase.lon2
        );
        const error = Math.abs(distance - testCase.expectedDistance);
        expect(error).toBeLessThanOrEqual(1);
      });
    });

    test('Medium distances should have ±0.5% accuracy', () => {
      const mediumDistances = testCases.filter(tc => 
        tc.expectedDistance > 100 && tc.expectedDistance <= 10000
      );
      mediumDistances.forEach(testCase => {
        const distance = locationManager.calculateDistance(
          testCase.lat1, testCase.lon1,
          testCase.lat2, testCase.lon2
        );
        const errorPercentage = (Math.abs(distance - testCase.expectedDistance) / testCase.expectedDistance) * 100;
        expect(errorPercentage).toBeLessThanOrEqual(0.5);
      });
    });

    test('Long distances should have ±0.3% accuracy', () => {
      const longDistances = testCases.filter(tc => 
        tc.expectedDistance > 10000 && tc.expectedDistance <= 500000
      );
      longDistances.forEach(testCase => {
        const distance = locationManager.calculateDistance(
          testCase.lat1, testCase.lon1,
          testCase.lat2, testCase.lon2
        );
        const errorPercentage = (Math.abs(distance - testCase.expectedDistance) / testCase.expectedDistance) * 100;
        expect(errorPercentage).toBeLessThanOrEqual(0.3);
      });
    });
  });
});
