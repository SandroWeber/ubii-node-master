const { DEFAULT_TOPICS, MSG_TYPES } = require('@tum-far/ubii-msg-formats');
const { LoggingService } = require('@tum-far/ubii-node-nodejs');
const { Service } = require('../service.js');
const { LocationManager } = require('../../location/locationManager');
const { ClientManager } = require('../../clients/clientManager');

const logger = LoggingService.instance.logger;

class LocationSubscriptionService extends Service {
    static LOG_TAG = 'LocationSubscriptionService';

    constructor() {
        super(
            DEFAULT_TOPICS.SERVICES.LOCATION_SUBSCRIPTION,
            MSG_TYPES.LOCATION_SUBSCRIPTION,
            MSG_TYPES.SUCCESS + ', ' + MSG_TYPES.ERROR
        );
    }

    reply(subscription) {
        try {
            // Verify the client
            if (!ClientManager.instance.verifyClient(subscription.clientId)) {
                throw new Error(`No client registered with ID "${subscription.clientId}"`);
            }

            // Add the subscription
            LocationManager.instance.addSubscription(subscription);

            return {
                success: {
                    title: 'Location Subscription Success',
                    message: `Successfully subscribed to topic ${subscription.topic} with location constraints`
                }
            };
        } catch (error) {
            logger.error({
                label: LocationSubscriptionService.LOG_TAG,
                message: error.toString()
            });

            return {
                error: {
                    title: 'Location Subscription Error',
                    message: error.toString()
                }
            };
        }
    }
}

module.exports = LocationSubscriptionService;