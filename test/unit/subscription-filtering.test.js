const { LocationManager } = require('../../src/location/locationManager');

describe('Subscription Filtering', () => {
  let locationManager;

  beforeEach(() => {
    locationManager = new LocationManager();
  });

  describe('Fixed location subscribers', () => {
    test('should include subscribers within range', () => {
      const publisherId = 'publisher-001';
      const topic = '/sensor/data';
      
      // Publisher at Munich center
      locationManager.updateDeviceLocation(publisherId, 48.148598, 11.567499, 5.0);
      
      // Fixed subscriber within 200m
      const nearSubscription = {
        topic: topic,
        max_distance: 200.0,
        use_dynamic_location: false,
        fixed_latitude: 48.148598,
        fixed_longitude: 11.568499, // ~100m away
        client_id: 'near-fixed-subscriber'
      };
      
      // Fixed subscriber outside range
      const farSubscription = {
        topic: topic,
        max_distance: 200.0,
        use_dynamic_location: false,
        fixed_latitude: 48.218598,
        fixed_longitude: 11.567499, // ~8km away
        client_id: 'far-fixed-subscriber'
      };
      
      locationManager.addSubscription(nearSubscription);
      locationManager.addSubscription(farSubscription);
      
      const subscribersInRange = locationManager.getSubscribersInRange(topic, publisherId);
      
      expect(subscribersInRange).toContain('near-fixed-subscriber');
      expect(subscribersInRange).not.toContain('far-fixed-subscriber');
      expect(subscribersInRange).toHaveLength(1);
    });

    test('should handle boundary conditions', () => {
      const publisherId = 'publisher-002';
      const topic = '/sensor/data';
      
      locationManager.updateDeviceLocation(publisherId, 48.148598, 11.567499, 5.0);
      
      // Subscriber exactly at max distance
      const boundarySubscription = {
        topic: topic,
        max_distance: 100.0,
        use_dynamic_location: false,
        fixed_latitude: 48.148598,
        fixed_longitude: 11.568499, // Exactly 100m away
        client_id: 'boundary-subscriber'
      };
      
      locationManager.addSubscription(boundarySubscription);
      
      const subscribersInRange = locationManager.getSubscribersInRange(topic, publisherId);
      
      // Should include subscriber at exact boundary
      expect(subscribersInRange).toContain('boundary-subscriber');
    });

    test('should handle multiple fixed subscribers with different ranges', () => {
      const publisherId = 'publisher-003';
      const topic = '/sensor/data';
      
      locationManager.updateDeviceLocation(publisherId, 48.148598, 11.567499, 5.0);
      
      const subscriptions = [
        {
          topic: topic,
          max_distance: 50.0,
          use_dynamic_location: false,
          fixed_latitude: 48.148598,
          fixed_longitude: 11.567999, // ~50m away
          client_id: 'close-subscriber'
        },
        {
          topic: topic,
          max_distance: 200.0,
          use_dynamic_location: false,
          fixed_latitude: 48.148598,
          fixed_longitude: 11.568499, // ~100m away
          client_id: 'medium-subscriber'
        },
        {
          topic: topic,
          max_distance: 500.0,
          use_dynamic_location: false,
          fixed_latitude: 48.148598,
          fixed_longitude: 11.569499, // ~200m away
          client_id: 'far-subscriber'
        }
      ];
      
      subscriptions.forEach(sub => locationManager.addSubscription(sub));
      
      const subscribersInRange = locationManager.getSubscribersInRange(topic, publisherId);
      
      expect(subscribersInRange).toContain('close-subscriber');
      expect(subscribersInRange).toContain('medium-subscriber');
      expect(subscribersInRange).toContain('far-subscriber');
      expect(subscribersInRange).toHaveLength(3);
    });
  });

  describe('Dynamic location subscribers', () => {
    test('should include dynamic subscribers within range', () => {
      const publisherId = 'publisher-004';
      const subscriberId = 'dynamic-subscriber-001';
      const topic = '/sensor/data';
      
      // Publisher at Munich center
      locationManager.updateDeviceLocation(publisherId, 48.148598, 11.567499, 5.0);
      
      // Dynamic subscriber within range
      locationManager.updateDeviceLocation(subscriberId, 48.148598, 11.568499, 5.0); // ~100m away
      
      const subscription = {
        topic: topic,
        max_distance: 200.0,
        use_dynamic_location: true,
        fixed_latitude: 0.0, // Not used
        fixed_longitude: 0.0, // Not used
        client_id: subscriberId
      };
      
      locationManager.addSubscription(subscription);
      
      const subscribersInRange = locationManager.getSubscribersInRange(topic, publisherId);
      
      expect(subscribersInRange).toContain(subscriberId);
      expect(subscribersInRange).toHaveLength(1);
    });

    test('should exclude dynamic subscribers outside range', () => {
      const publisherId = 'publisher-005';
      const subscriberId = 'dynamic-subscriber-002';
      const topic = '/sensor/data';
      
      // Publisher at Munich center
      locationManager.updateDeviceLocation(publisherId, 48.148598, 11.567499, 5.0);
      
      // Dynamic subscriber outside range
      locationManager.updateDeviceLocation(subscriberId, 48.218598, 11.567499, 5.0); // ~8km away
      
      const subscription = {
        topic: topic,
        max_distance: 200.0,
        use_dynamic_location: true,
        fixed_latitude: 0.0,
        fixed_longitude: 0.0,
        client_id: subscriberId
      };
      
      locationManager.addSubscription(subscription);
      
      const subscribersInRange = locationManager.getSubscribersInRange(topic, publisherId);
      
      expect(subscribersInRange).not.toContain(subscriberId);
      expect(subscribersInRange).toHaveLength(0);
    });

    test('should handle dynamic subscriber location updates', () => {
      const publisherId = 'publisher-006';
      const subscriberId = 'dynamic-subscriber-003';
      const topic = '/sensor/data';
      
      // Publisher at Munich center
      locationManager.updateDeviceLocation(publisherId, 48.148598, 11.567499, 5.0);
      
      const subscription = {
        topic: topic,
        max_distance: 200.0,
        use_dynamic_location: true,
        fixed_latitude: 0.0,
        fixed_longitude: 0.0,
        client_id: subscriberId
      };
      
      locationManager.addSubscription(subscription);
      
      // Initially subscriber is outside range
      locationManager.updateDeviceLocation(subscriberId, 48.218598, 11.567499, 5.0); // ~8km away
      let subscribersInRange = locationManager.getSubscribersInRange(topic, publisherId);
      expect(subscribersInRange).not.toContain(subscriberId);
      
      // Move subscriber into range
      locationManager.updateDeviceLocation(subscriberId, 48.148598, 11.568499, 5.0); // ~100m away
      subscribersInRange = locationManager.getSubscribersInRange(topic, publisherId);
      expect(subscribersInRange).toContain(subscriberId);
      
      // Move subscriber back outside range
      locationManager.updateDeviceLocation(subscriberId, 48.218598, 11.567499, 5.0); // ~8km away
      subscribersInRange = locationManager.getSubscribersInRange(topic, publisherId);
      expect(subscribersInRange).not.toContain(subscriberId);
    });
  });

  describe('Mixed fixed and dynamic subscribers', () => {
    test('should handle both types correctly', () => {
      const publisherId = 'publisher-007';
      const dynamicSubscriberId = 'dynamic-subscriber-004';
      const topic = '/sensor/data';
      
      // Publisher at Munich center
      locationManager.updateDeviceLocation(publisherId, 48.148598, 11.567499, 5.0);
      
      // Dynamic subscriber within range
      locationManager.updateDeviceLocation(dynamicSubscriberId, 48.148598, 11.568499, 5.0); // ~100m away
      
      const subscriptions = [
        {
          topic: topic,
          max_distance: 200.0,
          use_dynamic_location: true,
          fixed_latitude: 0.0,
          fixed_longitude: 0.0,
          client_id: dynamicSubscriberId
        },
        {
          topic: topic,
          max_distance: 200.0,
          use_dynamic_location: false,
          fixed_latitude: 48.148598,
          fixed_longitude: 11.567999, // ~50m away
          client_id: 'fixed-subscriber-001'
        },
        {
          topic: topic,
          max_distance: 200.0,
          use_dynamic_location: false,
          fixed_latitude: 48.218598,
          fixed_longitude: 11.567499, // ~8km away
          client_id: 'fixed-subscriber-002'
        }
      ];
      
      subscriptions.forEach(sub => locationManager.addSubscription(sub));
      
      const subscribersInRange = locationManager.getSubscribersInRange(topic, publisherId);
      
      expect(subscribersInRange).toContain(dynamicSubscriberId);
      expect(subscribersInRange).toContain('fixed-subscriber-001');
      expect(subscribersInRange).not.toContain('fixed-subscriber-002');
      expect(subscribersInRange).toHaveLength(2);
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle missing publisher location', () => {
      const publisherId = 'missing-publisher';
      const topic = '/sensor/data';
      
      const subscription = {
        topic: topic,
        max_distance: 200.0,
        use_dynamic_location: false,
        fixed_latitude: 48.148598,
        fixed_longitude: 11.567499,
        client_id: 'test-subscriber'
      };
      
      locationManager.addSubscription(subscription);
      
      const subscribersInRange = locationManager.getSubscribersInRange(topic, publisherId);
      
      // Should return empty array when publisher location is unknown
      expect(subscribersInRange).toEqual([]);
    });

    test('should handle missing dynamic subscriber location', () => {
      const publisherId = 'publisher-008';
      const subscriberId = 'missing-dynamic-subscriber';
      const topic = '/sensor/data';
      
      // Publisher at Munich center
      locationManager.updateDeviceLocation(publisherId, 48.148598, 11.567499, 5.0);
      
      const subscription = {
        topic: topic,
        max_distance: 200.0,
        use_dynamic_location: true,
        fixed_latitude: 0.0,
        fixed_longitude: 0.0,
        client_id: subscriberId
      };
      
      locationManager.addSubscription(subscription);
      
      const subscribersInRange = locationManager.getSubscribersInRange(topic, publisherId);
      
      // Should exclude subscriber with unknown location
      expect(subscribersInRange).not.toContain(subscriberId);
      expect(subscribersInRange).toHaveLength(0);
    });

    test('should handle subscription removal', () => {
      const publisherId = 'publisher-009';
      const subscriberId = 'removable-subscriber';
      const topic = '/sensor/data';
      
      locationManager.updateDeviceLocation(publisherId, 48.148598, 11.567499, 5.0);
      locationManager.updateDeviceLocation(subscriberId, 48.148598, 11.568499, 5.0); // ~100m away
      
      const subscription = {
        topic: topic,
        max_distance: 200.0,
        use_dynamic_location: true,
        fixed_latitude: 0.0,
        fixed_longitude: 0.0,
        client_id: subscriberId
      };
      
      locationManager.addSubscription(subscription);
      
      // Verify subscriber is included
      let subscribersInRange = locationManager.getSubscribersInRange(topic, publisherId);
      expect(subscribersInRange).toContain(subscriberId);
      
      // Remove subscription
      locationManager.removeSubscription(topic, subscriberId);
      
      // Verify subscriber is excluded
      subscribersInRange = locationManager.getSubscribersInRange(topic, publisherId);
      expect(subscribersInRange).not.toContain(subscriberId);
      expect(subscribersInRange).toHaveLength(0);
    });
  });

  describe('Performance tests', () => {
    test('should handle large number of subscriptions efficiently', () => {
      const publisherId = 'publisher-010';
      const topic = '/sensor/data';
      
      locationManager.updateDeviceLocation(publisherId, 48.148598, 11.567499, 5.0);
      
      const startTime = performance.now();
      const numSubscriptions = 1000;
      
      // Create many subscriptions
      for (let i = 0; i < numSubscriptions; i++) {
        const subscription = {
          topic: topic,
          max_distance: 200.0,
          use_dynamic_location: false,
          fixed_latitude: 48.148598 + (Math.random() - 0.5) * 0.01, // Random position within ~1km
          fixed_longitude: 11.567499 + (Math.random() - 0.5) * 0.01,
          client_id: `subscriber-${i}`
        };
        locationManager.addSubscription(subscription);
      }
      
      // Test filtering performance
      const filterStartTime = performance.now();
      const subscribersInRange = locationManager.getSubscribersInRange(topic, publisherId);
      const filterEndTime = performance.now();
      
      const totalTime = filterEndTime - startTime;
      const filterTime = filterEndTime - filterStartTime;
      
      console.log(`Subscription Filtering Performance:`);
      console.log(`  Total subscriptions: ${numSubscriptions}`);
      console.log(`  Subscribers in range: ${subscribersInRange.length}`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Filter time: ${filterTime.toFixed(2)}ms`);
      console.log(`  Average time per subscription: ${(filterTime / numSubscriptions).toFixed(4)}ms`);
      
      // Performance should be reasonable (< 1ms per subscription)
      expect(filterTime / numSubscriptions).toBeLessThan(1.0);
    });
  });
});
