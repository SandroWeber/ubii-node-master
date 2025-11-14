const { UbiiClientService } = require('@tum-far/ubii-node-webbrowser');
const { v4: uuidv4 } = require('uuid');

async function testLocationAwarePubSub() {
    try {
        // Initialize client service
        await UbiiClientService.instance.connect();
        console.log('Connected to master node');

        // Create publisher device in Munich
        const publisherDevice = {
            name: 'Publisher Device',
            deviceType: 0, // PARTICIPANT
            components: [{
                topic: '/test/location/message',
                messageFormat: 'string',
                ioType: 0 // PUBLISHER
            }],
            latitude: 48.148598,  // Munich
            longitude: 11.567499
        };

        // Create subscriber device 1 (nearby, ~100m away)
        const subscriber1Device = {
            name: 'Nearby Subscriber',
            deviceType: 0, // PARTICIPANT
            components: [{
                topic: '/test/location/message',
                messageFormat: 'string',
                ioType: 1 // SUBSCRIBER
            }],
            latitude: 48.148700,
            longitude: 11.567600
        };

        // Create subscriber device 2 (far away, ~8km)
        const subscriber2Device = {
            name: 'Far Subscriber',
            deviceType: 0, // PARTICIPANT
            components: [{
                topic: '/test/location/message',
                messageFormat: 'string',
                ioType: 1 // SUBSCRIBER
            }],
            latitude: 48.208174,
            longitude: 11.627624
        };

        // Register devices
        const publisher = await UbiiClientService.instance.registerDevice(publisherDevice);
        const subscriber1 = await UbiiClientService.instance.registerDevice(subscriber1Device);
        const subscriber2 = await UbiiClientService.instance.registerDevice(subscriber2Device);

        console.log('Devices registered successfully');

        // Create location-aware subscriptions
        await UbiiClientService.instance.callService({
            topic: '/services/location/subscription',
            locationSubscription: {
                topic: '/test/location/message',
                max_distance: 1000, // 1km radius
                use_dynamic_location: true,
                client_id: subscriber1.id
            }
        });

        await UbiiClientService.instance.callService({
            topic: '/services/location/subscription',
            locationSubscription: {
                topic: '/test/location/message',
                max_distance: 1000, // 1km radius
                use_dynamic_location: true,
                client_id: subscriber2.id
            }
        });

        console.log('Location subscriptions created');

        // Set up message handlers
        UbiiClientService.instance.on('topicData', (topicData) => {
            if (topicData.topic === '/test/location/message') {
                console.log(`Received message: ${topicData.string}`);
            }
        });

        // Publish test messages
        setInterval(() => {
            UbiiClientService.instance.publishRecord({
                topic: '/test/location/message',
                string: 'Test message at ' + new Date().toISOString()
            });
        }, 2000);

        // After 10 seconds, move subscriber1 far away
        setTimeout(async () => {
            console.log('Moving subscriber1 far away...');
            await UbiiClientService.instance.callService({
                topic: '/services/location/update',
                device: {
                    id: subscriber1.id,
                    latitude: 48.208174,
                    longitude: 11.627624
                }
            });
        }, 10000);

        console.log('Test running... Check the console for messages');
        console.log('Only nearby subscribers should receive messages');
        console.log('After 10 seconds, subscriber1 will move far away and stop receiving messages');

    } catch (error) {
        console.error('Error:', error);
    }
}

testLocationAwarePubSub(); 