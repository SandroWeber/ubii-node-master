const { proto } = require('@tum-far/ubii-msg-formats');

describe('Protobuf Serialization/Deserialization', () => {
  describe('Device message with location fields', () => {
    test('should serialize and deserialize device with GPS coordinates', () => {
      const originalDevice = {
        id: 'test-device-001',
        name: 'Test GPS Device',
        deviceType: 'SMARTPHONE',
        components: [
          {
            name: 'GPS',
            topic: '/gps/location',
            messageFormat: 'ubii.dataStructure.Vector2'
          }
        ],
        latitude: 48.148598,
        longitude: 11.567499,
        location_accuracy: 5.0
      };

      // Create protobuf message
      const deviceMessage = new proto.ubii.devices.Device();
      deviceMessage.setId(originalDevice.id);
      deviceMessage.setName(originalDevice.name);
      deviceMessage.setDeviceType(proto.ubii.devices.Device.DeviceType.SMARTPHONE);
      
      // Add components
      const component = new proto.ubii.devices.Component();
      component.setName(originalDevice.components[0].name);
      component.setTopic(originalDevice.components[0].topic);
      component.setMessageFormat(originalDevice.components[0].messageFormat);
      deviceMessage.addComponents(component);

      // Add location fields
      deviceMessage.setLatitude(originalDevice.latitude);
      deviceMessage.setLongitude(originalDevice.longitude);
      deviceMessage.setLocationAccuracy(originalDevice.location_accuracy);

      // Serialize
      const serialized = deviceMessage.serializeBinary();
      expect(serialized).toBeInstanceOf(Uint8Array);
      expect(serialized.length).toBeGreaterThan(0);

      // Deserialize
      const deserializedDevice = proto.ubii.devices.Device.deserializeBinary(serialized);
      
      // Verify all fields match
      expect(deserializedDevice.getId()).toBe(originalDevice.id);
      expect(deserializedDevice.getName()).toBe(originalDevice.name);
      expect(deserializedDevice.getDeviceType()).toBe(proto.ubii.devices.Device.DeviceType.SMARTPHONE);
      expect(deserializedDevice.getLatitude()).toBe(originalDevice.latitude);
      expect(deserializedDevice.getLongitude()).toBe(originalDevice.longitude);
      expect(deserializedDevice.getLocationAccuracy()).toBe(originalDevice.location_accuracy);
      
      // Verify components
      expect(deserializedDevice.getComponentsList()).toHaveLength(1);
      expect(deserializedDevice.getComponentsList()[0].getName()).toBe(originalDevice.components[0].name);
      expect(deserializedDevice.getComponentsList()[0].getTopic()).toBe(originalDevice.components[0].topic);
      expect(deserializedDevice.getComponentsList()[0].getMessageFormat()).toBe(originalDevice.components[0].messageFormat);
    });

    test('should handle device without location fields', () => {
      const originalDevice = {
        id: 'test-device-002',
        name: 'Test Device No GPS',
        deviceType: 'SENSOR'
      };

      const deviceMessage = new proto.ubii.devices.Device();
      deviceMessage.setId(originalDevice.id);
      deviceMessage.setName(originalDevice.name);
      deviceMessage.setDeviceType(proto.ubii.devices.Device.DeviceType.SENSOR);

      const serialized = deviceMessage.serializeBinary();
      const deserializedDevice = proto.ubii.devices.Device.deserializeBinary(serialized);

      expect(deserializedDevice.getId()).toBe(originalDevice.id);
      expect(deserializedDevice.getName()).toBe(originalDevice.name);
      expect(deserializedDevice.getDeviceType()).toBe(proto.ubii.devices.Device.DeviceType.SENSOR);
      
      // Location fields should be undefined or default values
      expect(deserializedDevice.getLatitude()).toBe(0);
      expect(deserializedDevice.getLongitude()).toBe(0);
      expect(deserializedDevice.getLocationAccuracy()).toBe(0);
    });

    test('should handle extreme coordinate values', () => {
      const extremeDevice = {
        id: 'extreme-device',
        name: 'Extreme Coordinates',
        deviceType: 'SMARTPHONE',
        latitude: 90.0,  // North Pole
        longitude: 180.0, // International Date Line
        location_accuracy: 0.1
      };

      const deviceMessage = new proto.ubii.devices.Device();
      deviceMessage.setId(extremeDevice.id);
      deviceMessage.setName(extremeDevice.name);
      deviceMessage.setDeviceType(proto.ubii.devices.Device.DeviceType.SMARTPHONE);
      deviceMessage.setLatitude(extremeDevice.latitude);
      deviceMessage.setLongitude(extremeDevice.longitude);
      deviceMessage.setLocationAccuracy(extremeDevice.location_accuracy);

      const serialized = deviceMessage.serializeBinary();
      const deserializedDevice = proto.ubii.devices.Device.deserializeBinary(serialized);

      expect(deserializedDevice.getLatitude()).toBe(extremeDevice.latitude);
      expect(deserializedDevice.getLongitude()).toBe(extremeDevice.longitude);
      expect(deserializedDevice.getLocationAccuracy()).toBe(extremeDevice.location_accuracy);
    });
  });

  describe('LocationSubscription message', () => {
    test('should serialize and deserialize dynamic location subscription', () => {
      const originalSubscription = {
        topic: '/sensor/data',
        max_distance: 200.0,
        use_dynamic_location: true,
        fixed_latitude: 0.0,  // Not used for dynamic
        fixed_longitude: 0.0, // Not used for dynamic
        client_id: 'mobile-client-001'
      };

      const subscriptionMessage = new proto.ubii.services.request.LocationSubscription();
      subscriptionMessage.setTopic(originalSubscription.topic);
      subscriptionMessage.setMaxDistance(originalSubscription.max_distance);
      subscriptionMessage.setUseDynamicLocation(originalSubscription.use_dynamic_location);
      subscriptionMessage.setFixedLatitude(originalSubscription.fixed_latitude);
      subscriptionMessage.setFixedLongitude(originalSubscription.fixed_longitude);
      subscriptionMessage.setClientId(originalSubscription.client_id);

      const serialized = subscriptionMessage.serializeBinary();
      const deserializedSubscription = proto.ubii.services.request.LocationSubscription.deserializeBinary(serialized);

      expect(deserializedSubscription.getTopic()).toBe(originalSubscription.topic);
      expect(deserializedSubscription.getMaxDistance()).toBe(originalSubscription.max_distance);
      expect(deserializedSubscription.getUseDynamicLocation()).toBe(originalSubscription.use_dynamic_location);
      expect(deserializedSubscription.getFixedLatitude()).toBe(originalSubscription.fixed_latitude);
      expect(deserializedSubscription.getFixedLongitude()).toBe(originalSubscription.fixed_longitude);
      expect(deserializedSubscription.getClientId()).toBe(originalSubscription.client_id);
    });

    test('should serialize and deserialize fixed location subscription', () => {
      const originalSubscription = {
        topic: '/sensor/data',
        max_distance: 500.0,
        use_dynamic_location: false,
        fixed_latitude: 48.148598,
        fixed_longitude: 11.567499,
        client_id: 'fixed-sensor-001'
      };

      const subscriptionMessage = new proto.ubii.services.request.LocationSubscription();
      subscriptionMessage.setTopic(originalSubscription.topic);
      subscriptionMessage.setMaxDistance(originalSubscription.max_distance);
      subscriptionMessage.setUseDynamicLocation(originalSubscription.use_dynamic_location);
      subscriptionMessage.setFixedLatitude(originalSubscription.fixed_latitude);
      subscriptionMessage.setFixedLongitude(originalSubscription.fixed_longitude);
      subscriptionMessage.setClientId(originalSubscription.client_id);

      const serialized = subscriptionMessage.serializeBinary();
      const deserializedSubscription = proto.ubii.services.request.LocationSubscription.deserializeBinary(serialized);

      expect(deserializedSubscription.getTopic()).toBe(originalSubscription.topic);
      expect(deserializedSubscription.getMaxDistance()).toBe(originalSubscription.max_distance);
      expect(deserializedSubscription.getUseDynamicLocation()).toBe(originalSubscription.use_dynamic_location);
      expect(deserializedSubscription.getFixedLatitude()).toBe(originalSubscription.fixed_latitude);
      expect(deserializedSubscription.getFixedLongitude()).toBe(originalSubscription.fixed_longitude);
      expect(deserializedSubscription.getClientId()).toBe(originalSubscription.client_id);
    });

    test('should handle large distance values', () => {
      const largeDistanceSubscription = {
        topic: '/long-range/data',
        max_distance: 100000.0, // 100km
        use_dynamic_location: true,
        fixed_latitude: 0.0,
        fixed_longitude: 0.0,
        client_id: 'long-range-client'
      };

      const subscriptionMessage = new proto.ubii.services.request.LocationSubscription();
      subscriptionMessage.setTopic(largeDistanceSubscription.topic);
      subscriptionMessage.setMaxDistance(largeDistanceSubscription.max_distance);
      subscriptionMessage.setUseDynamicLocation(largeDistanceSubscription.use_dynamic_location);
      subscriptionMessage.setFixedLatitude(largeDistanceSubscription.fixed_latitude);
      subscriptionMessage.setFixedLongitude(largeDistanceSubscription.fixed_longitude);
      subscriptionMessage.setClientId(largeDistanceSubscription.client_id);

      const serialized = subscriptionMessage.serializeBinary();
      const deserializedSubscription = proto.ubii.services.request.LocationSubscription.deserializeBinary(serialized);

      expect(deserializedSubscription.getMaxDistance()).toBe(largeDistanceSubscription.max_distance);
    });
  });

  describe('LocationSubscriptionList message', () => {
    test('should serialize and deserialize multiple subscriptions', () => {
      const subscriptions = [
        {
          topic: '/sensor/data',
          max_distance: 200.0,
          use_dynamic_location: true,
          fixed_latitude: 0.0,
          fixed_longitude: 0.0,
          client_id: 'client-001'
        },
        {
          topic: '/sensor/data',
          max_distance: 500.0,
          use_dynamic_location: false,
          fixed_latitude: 48.148598,
          fixed_longitude: 11.567499,
          client_id: 'client-002'
        },
        {
          topic: '/camera/feed',
          max_distance: 100.0,
          use_dynamic_location: true,
          fixed_latitude: 0.0,
          fixed_longitude: 0.0,
          client_id: 'client-003'
        }
      ];

      const subscriptionList = new proto.ubii.services.request.LocationSubscriptionList();
      
      subscriptions.forEach(sub => {
        const subscriptionMessage = new proto.ubii.services.request.LocationSubscription();
        subscriptionMessage.setTopic(sub.topic);
        subscriptionMessage.setMaxDistance(sub.max_distance);
        subscriptionMessage.setUseDynamicLocation(sub.use_dynamic_location);
        subscriptionMessage.setFixedLatitude(sub.fixed_latitude);
        subscriptionMessage.setFixedLongitude(sub.fixed_longitude);
        subscriptionMessage.setClientId(sub.client_id);
        
        subscriptionList.addElements(subscriptionMessage);
      });

      const serialized = subscriptionList.serializeBinary();
      const deserializedList = proto.ubii.services.request.LocationSubscriptionList.deserializeBinary(serialized);

      expect(deserializedList.getElementsList()).toHaveLength(3);
      
      // Verify each subscription
      deserializedList.getElementsList().forEach((sub, index) => {
        expect(sub.getTopic()).toBe(subscriptions[index].topic);
        expect(sub.getMaxDistance()).toBe(subscriptions[index].max_distance);
        expect(sub.getUseDynamicLocation()).toBe(subscriptions[index].use_dynamic_location);
        expect(sub.getFixedLatitude()).toBe(subscriptions[index].fixed_latitude);
        expect(sub.getFixedLongitude()).toBe(subscriptions[index].fixed_longitude);
        expect(sub.getClientId()).toBe(subscriptions[index].client_id);
      });
    });
  });

  describe('Performance tests', () => {
    test('should handle rapid serialization/deserialization', () => {
      const device = {
        id: 'perf-test-device',
        name: 'Performance Test Device',
        deviceType: 'SMARTPHONE',
        latitude: 48.148598,
        longitude: 11.567499,
        location_accuracy: 5.0
      };

      const startTime = performance.now();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const deviceMessage = new proto.ubii.devices.Device();
        deviceMessage.setId(device.id);
        deviceMessage.setName(device.name);
        deviceMessage.setDeviceType(proto.ubii.devices.Device.DeviceType.SMARTPHONE);
        deviceMessage.setLatitude(device.latitude);
        deviceMessage.setLongitude(device.longitude);
        deviceMessage.setLocationAccuracy(device.location_accuracy);

        const serialized = deviceMessage.serializeBinary();
        const deserialized = proto.ubii.devices.Device.deserializeBinary(serialized);
        
        // Verify deserialization worked
        expect(deserialized.getId()).toBe(device.id);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;

      console.log(`Serialization/Deserialization Performance:`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Iterations: ${iterations}`);
      console.log(`  Average time per operation: ${avgTime.toFixed(4)}ms`);

      // Performance should be reasonable (< 1ms per operation)
      expect(avgTime).toBeLessThan(1.0);
    });
  });
});
