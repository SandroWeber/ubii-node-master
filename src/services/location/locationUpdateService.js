const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const { LoggingService } = require('@tum-far/ubii-node-nodejs');
const { Service } = require('../service.js');
const { DeviceManager } = require('../../devices/deviceManager');

const logger = LoggingService.instance.logger;

class LocationUpdateService extends Service {
    static LOG_TAG = 'LocationUpdateService';

    constructor(deviceManager) {
        super(
            DEFAULT_TOPICS.SERVICES.LOCATION_UPDATE,
            MSG_TYPES.DEVICE,
            MSG_TYPES.SUCCESS + ', ' + MSG_TYPES.ERROR
        );

        this.deviceManager = deviceManager;
    }

    reply(deviceSpecs) {
        try {
            if (!deviceSpecs.id) {
                throw new Error('Device ID is required for location update');
            }

            if (deviceSpecs.latitude === undefined || deviceSpecs.longitude === undefined) {
                throw new Error('Both latitude and longitude are required for location update');
            }

            this.deviceManager.updateDeviceLocation(deviceSpecs.id, {
                latitude: deviceSpecs.latitude,
                longitude: deviceSpecs.longitude,
                location_accuracy: deviceSpecs.location_accuracy
            });

            return {
                success: {
                    title: 'Location Update Success',
                    message: `Successfully updated location for device ${deviceSpecs.id}`
                }
            };
        } catch (error) {
            logger.error({
                label: LocationUpdateService.LOG_TAG,
                message: error.toString()
            });

            return {
                error: {
                    title: 'Location Update Error',
                    message: error.toString()
                }
            };
        }
    }
}

module.exports = LocationUpdateService; 