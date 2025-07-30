const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const { LoggingService } = require('@tum-far/ubii-node-nodejs');
const { Service } = require('../service.js');
const { LocationManager } = require('../../location/locationManager');

const logger = LoggingService.instance.logger;

class ProximityService extends Service {
    static LOG_TAG = 'ProximityService';

    constructor() {
        super(
            '/services/location/proximity',
            MSG_TYPES.DEVICE,
            MSG_TYPES.SUCCESS + ', ' + MSG_TYPES.ERROR
        );
    }

    // Calculate distance between two points using Haversine formula
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // Distance in kilometers
        return distance * 1000; // Convert to meters
    }

    toRadians(degrees) {
        return degrees * (Math.PI/180);
    }

    reply(request) {
        try {
            const { sourceDeviceId, targetDeviceId, maxDistance = 100 } = request;

            if (!sourceDeviceId || !targetDeviceId) {
                throw new Error('Both sourceDeviceId and targetDeviceId are required');
            }

            // Get locations of both devices
            const sourceLocation = LocationManager.instance.getDeviceLocation(sourceDeviceId);
            const targetLocation = LocationManager.instance.getDeviceLocation(targetDeviceId);

            if (!sourceLocation) {
                throw new Error(`Source device ${sourceDeviceId} location not found`);
            }

            if (!targetLocation) {
                throw new Error(`Target device ${targetDeviceId} location not found`);
            }

            // Calculate distance
            const distance = this.calculateDistance(
                sourceLocation.latitude,
                sourceLocation.longitude,
                targetLocation.latitude,
                targetLocation.longitude
            );

            // Check if devices are within proximity
            const isWithinProximity = distance <= maxDistance;

            logger.info({
                label: ProximityService.LOG_TAG,
                message: `Proximity check: ${sourceDeviceId} -> ${targetDeviceId}, Distance: ${distance.toFixed(2)}m, Max: ${maxDistance}m, Allowed: ${isWithinProximity}`
            });

            return {
                success: {
                    title: 'Proximity Check Success',
                    message: `Proximity validation completed`,
                    data: {
                        sourceDeviceId,
                        targetDeviceId,
                        distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
                        maxDistance,
                        isWithinProximity,
                        sourceLocation: {
                            latitude: sourceLocation.latitude,
                            longitude: sourceLocation.longitude
                        },
                        targetLocation: {
                            latitude: targetLocation.latitude,
                            longitude: targetLocation.longitude
                        }
                    }
                }
            };
        } catch (error) {
            logger.error({
                label: ProximityService.LOG_TAG,
                message: error.toString()
            });

            return {
                error: {
                    title: 'Proximity Check Error',
                    message: error.toString()
                }
            };
        }
    }
}

module.exports = { ProximityService }; 