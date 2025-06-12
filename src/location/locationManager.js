const { EventEmitter } = require('events');
const { LoggingService } = require('@tum-far/ubii-node-nodejs');

const logger = LoggingService.instance.logger;

class LocationManager extends EventEmitter {
    static LOG_TAG = '[UBII LocationManager]';
    static EVENTS = {
        LOCATION_UPDATE: 'LOCATION_UPDATE'
    };

    constructor() {
        super();
        this.locationSubscriptions = new Map(); // topic -> [LocationSubscription]
        this.deviceLocations = new Map(); // deviceId -> {latitude, longitude, timestamp, accuracy}
        this.locationHistory = new Map(); // deviceId -> Array of historical locations
        this.maxHistorySize = 100; // Maximum number of historical locations to keep per device
    }

    /**
     * Update device location
     * @param {string} deviceId Device ID
     * @param {number} latitude Latitude
     * @param {number} longitude Longitude
     * @param {number} accuracy Accuracy in meters
     */
    updateDeviceLocation(deviceId, latitude, longitude, accuracy = 0) {
        const location = {
            latitude,
            longitude,
            timestamp: Date.now(),
            accuracy
        };

        // Update current location
        this.deviceLocations.set(deviceId, location);

        // Update location history
        if (!this.locationHistory.has(deviceId)) {
            this.locationHistory.set(deviceId, []);
        }
        const history = this.locationHistory.get(deviceId);
        history.push(location);
        
        // Trim history if it exceeds max size
        if (history.length > this.maxHistorySize) {
            history.shift();
        }

        // Emit location update event
        this.emit(LocationManager.EVENTS.LOCATION_UPDATE, deviceId, location);

        // Log detailed location update
        logger.info({
            label: LocationManager.LOG_TAG,
            message: `Location update for device ${deviceId}`,
            details: {
                latitude,
                longitude,
                accuracy,
                timestamp: new Date(location.timestamp).toISOString(),
                historySize: history.length
            }
        });

        // Log significant location changes
        if (history.length > 1) {
            const previousLocation = history[history.length - 2];
            const distance = this.calculateDistance(
                previousLocation.latitude,
                previousLocation.longitude,
                latitude,
                longitude
            );
            
            if (distance > 10) { // Log if moved more than 10 meters
                logger.info({
                    label: LocationManager.LOG_TAG,
                    message: `Significant location change for device ${deviceId}`,
                    details: {
                        distance: `${distance.toFixed(2)}m`,
                        timeElapsed: `${((location.timestamp - previousLocation.timestamp) / 1000).toFixed(1)}s`,
                        speed: `${(distance / ((location.timestamp - previousLocation.timestamp) / 1000)).toFixed(2)}m/s`
                    }
                });
            }
        }
    }

    /**
     * Get location history for a device
     * @param {string} deviceId Device ID
     * @returns {Array} Array of historical locations
     */
    getLocationHistory(deviceId) {
        return this.locationHistory.get(deviceId) || [];
    }

    /**
     * Calculate distance between two points using Haversine formula
     * @param {number} lat1 Latitude of point 1
     * @param {number} lon1 Longitude of point 1
     * @param {number} lat2 Latitude of point 2
     * @param {number} lon2 Longitude of point 2
     * @returns {number} Distance in meters
     */
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

    /**
     * Add a location-based subscription
     * @param {object} subscription LocationSubscription object
     */
    addSubscription(subscription) {
        // Remove any existing subscription for this client and topic
        this.removeSubscription(subscription.topic, subscription.clientId);

        if (!this.locationSubscriptions.has(subscription.topic)) {
            this.locationSubscriptions.set(subscription.topic, []);
        }
        this.locationSubscriptions.get(subscription.topic).push(subscription);

        logger.debug({
            label: LocationManager.LOG_TAG,
            message: `Added location subscription for topic ${subscription.topic}`
        });
    }

    /**
     * Remove a location-based subscription
     * @param {string} topic Topic to unsubscribe from
     * @param {string} clientId Client ID
     */
    removeSubscription(topic, clientId) {
        if (this.locationSubscriptions.has(topic)) {
            const subscriptions = this.locationSubscriptions.get(topic);
            const filteredSubs = subscriptions.filter(sub => sub.clientId !== clientId);
            if (filteredSubs.length === 0) {
                this.locationSubscriptions.delete(topic);
            } else {
                this.locationSubscriptions.set(topic, filteredSubs);
            }
        }
    }

    /**
     * Get subscribers within range of a publisher
     * @param {string} topic Topic being published
     * @param {string} publisherDeviceId Publisher's device ID
     * @returns {Array} Array of client IDs within range
     */
    getSubscribersInRange(topic, publisherDeviceId) {
        if (!this.locationSubscriptions.has(topic)) {
            return [];
        }

        const publisherLocation = this.deviceLocations.get(publisherDeviceId);
        if (!publisherLocation) {
            logger.warn({
                label: LocationManager.LOG_TAG,
                message: `No location found for publisher device ${publisherDeviceId}`
            });
            return [];
        }

        return this.locationSubscriptions.get(topic)
            .filter(subscription => {
                const subscriberLat = subscription.use_dynamic_location ? 
                    (this.deviceLocations.get(subscription.clientId)?.latitude) : 
                    subscription.fixed_latitude;
                const subscriberLon = subscription.use_dynamic_location ? 
                    (this.deviceLocations.get(subscription.clientId)?.longitude) : 
                    subscription.fixed_longitude;

                if (subscriberLat === undefined || subscriberLon === undefined) {
                    logger.warn({
                        label: LocationManager.LOG_TAG,
                        message: `No location found for subscriber ${subscription.clientId}`
                    });
                    return false;
                }

                const distance = this.calculateDistance(
                    publisherLocation.latitude,
                    publisherLocation.longitude,
                    subscriberLat,
                    subscriberLon
                );

                logger.debug({
                    label: LocationManager.LOG_TAG,
                    message: `Distance calculation for ${subscription.clientId}: distance=${distance}m, max_distance=${subscription.max_distance}m`
                });

                return distance <= subscription.max_distance;
            })
            .map(subscription => subscription.clientId);
    }
}

// Singleton pattern
let instance = null;
const SINGLETON_ENFORCER = Symbol();

class LocationManagerSingleton {
    constructor(enforcer) {
        if (enforcer !== SINGLETON_ENFORCER) {
            throw new Error('Use LocationManager.instance');
        }
        this.locationManager = new LocationManager();
    }

    static get instance() {
        if (!instance) {
            instance = new LocationManagerSingleton(SINGLETON_ENFORCER);
        }
        return instance.locationManager;
    }
}

module.exports = {
    LocationManager: LocationManagerSingleton
}; 