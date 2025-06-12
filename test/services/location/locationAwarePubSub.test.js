const { expect } = require('chai');
const { LocationManager } = require('../../../src/location/locationManager');
const DeviceManager = require('../../../src/devices/deviceManager');
const MASTER_NODE_CONSTANTS = require('../../../src/node/constants');
const { v4: uuidv4 } = require('uuid');

// Mock dependencies
const mockTopicData = {
    publish: () => {},
    subscribeTopic: () => {},
    remove: () => {}
};

const mockClientManager = {
    hasClient: () => true,
    getClient: () => ({
        devices: []
    })
};

const mockNotifyConditionsManager = {
    getNotifyCondition: () => null
};

const mockMasterNode = {
    getDependency: (name) => {
        switch(name) {
            case MASTER_NODE_CONSTANTS.TOPIC_DATA_BUFFER:
                return mockTopicData;
            case MASTER_NODE_CONSTANTS.MANAGERS.CLIENTS:
                return mockClientManager;
            case MASTER_NODE_CONSTANTS.MANAGERS.NOTIFY_CONDITIONS:
                return mockNotifyConditionsManager;
            default:
                return null;
        }
    }
};

describe('Location-Aware Pub/Sub', () => {
    let locationManager;
    let deviceManager;
    let publisher;
    let subscriber1;
    let subscriber2;
    let subscriber3;

    beforeEach(() => {
        locationManager = LocationManager.instance;
        deviceManager = new DeviceManager();
        deviceManager.setDependencies(mockMasterNode);

        // Create test devices
        publisher = {
            id: uuidv4(),
            name: 'Publisher',
            latitude: 48.148598,  // Munich
            longitude: 11.567499,
            location_accuracy: 10
        };

        subscriber1 = {
            id: uuidv4(),
            name: 'Nearby Subscriber',
            latitude: 48.148700,  // ~100m from publisher
            longitude: 11.567600
        };

        subscriber2 = {
            id: uuidv4(),
            name: 'Far Subscriber',
            latitude: 48.208174,  // ~8km from publisher
            longitude: 11.627624
        };

        subscriber3 = {
            id: uuidv4(),
            name: 'Fixed Location Subscriber',
            fixed_latitude: 48.148800,  // ~200m from publisher
            fixed_longitude: 11.567700
        };

        // Register devices
        locationManager.updateDeviceLocation(publisher.id, publisher.latitude, publisher.longitude, publisher.location_accuracy);
        locationManager.updateDeviceLocation(subscriber1.id, subscriber1.latitude, subscriber1.longitude);
        locationManager.updateDeviceLocation(subscriber2.id, subscriber2.latitude, subscriber2.longitude);
    });

    describe('Distance Calculation', () => {
        it('should correctly calculate distances between points', () => {
            const distance = locationManager.calculateDistance(
                publisher.latitude,
                publisher.longitude,
                subscriber1.latitude,
                subscriber1.longitude
            );
            expect(distance).to.be.below(150); // Should be roughly 100m
        });
    });

    describe('Subscription Management', () => {
        const testTopic = '/test/location/aware';

        beforeEach(() => {
            // Add test subscriptions
            locationManager.addSubscription({
                topic: testTopic,
                clientId: subscriber1.id,
                max_distance: 1000,  // 1km radius
                use_dynamic_location: true
            });

            locationManager.addSubscription({
                topic: testTopic,
                clientId: subscriber2.id,
                max_distance: 1000,  // 1km radius
                use_dynamic_location: true
            });

            locationManager.addSubscription({
                topic: testTopic,
                clientId: subscriber3.id,
                max_distance: 1000,  // 1km radius
                use_dynamic_location: false,
                fixed_latitude: subscriber3.fixed_latitude,
                fixed_longitude: subscriber3.fixed_longitude
            });
        });

        it('should find nearby subscribers', () => {
            const subscribers = locationManager.getSubscribersInRange(testTopic, publisher.id);
            expect(subscribers).to.include(subscriber1.id);
            expect(subscribers).to.not.include(subscriber2.id);
            expect(subscribers).to.include(subscriber3.id);
        });

        it('should handle dynamic location updates', () => {
            // Move subscriber1 far away
            locationManager.updateDeviceLocation(
                subscriber1.id,
                subscriber2.latitude,
                subscriber2.longitude
            );

            const subscribers = locationManager.getSubscribersInRange(testTopic, publisher.id);
            expect(subscribers).to.not.include(subscriber1.id);
            expect(subscribers).to.not.include(subscriber2.id);
            expect(subscribers).to.include(subscriber3.id);
        });

        it('should respect max distance settings', () => {
            // Remove existing subscription
            locationManager.removeSubscription(testTopic, subscriber1.id);

            // Calculate actual distance for verification
            const actualDistance = locationManager.calculateDistance(
                publisher.latitude,
                publisher.longitude,
                subscriber1.latitude,
                subscriber1.longitude
            );
            console.log(`Actual distance between publisher and subscriber1: ${actualDistance}m`);

            // Add subscription with radius smaller than actual distance
            const maxDistance = Math.floor(actualDistance - 10); // 10m less than actual distance
            console.log(`Setting max_distance to: ${maxDistance}m`);

            locationManager.addSubscription({
                topic: testTopic,
                clientId: subscriber1.id,
                max_distance: maxDistance,
                use_dynamic_location: true
            });

            const subscribers = locationManager.getSubscribersInRange(testTopic, publisher.id);
            expect(subscribers).to.not.include(subscriber1.id);
            expect(subscribers).to.include(subscriber3.id); // Fixed location subscriber should still be included
        });

        it('should handle subscription removal', () => {
            locationManager.removeSubscription(testTopic, subscriber1.id);
            const subscribers = locationManager.getSubscribersInRange(testTopic, publisher.id);
            expect(subscribers).to.not.include(subscriber1.id);
        });
    });
}); 