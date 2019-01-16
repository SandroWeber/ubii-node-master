const {
    Service
} = require('./service.js');
const namida = require("@tum-far/namida");

class SubscribtionService extends Service{
    constructor(deviceManager) {
        super('subscribtion');
        
        this.deviceManager = deviceManager;
    }

    reply(message){
        // Prepare the context.
        let context = this.prepareContext();

        // Extract the relevant information.
        let deviceIdentifier = message.deviceIdentifier;

        // Verify the device and act accordingly.
        if(!this.deviceManager.verifyParticipant(deviceIdentifier)){
            // Update the context feedback.
            context.feedback.message = `There is no Participant registered with the id ${namida.style.messageHighlight(deviceIdentifier)}. ` +
                `Subscribtion was rejected due to an unregistered device.`;
            context.feedback.title = 'Subscribtion rejected';
    
            namida.logFailure(context.feedback.title, context.feedback.message);

            return this.serviceReplyTranslator.createBufferFromPayload({
                error: {
                    title: context.feedback.title,
                    message: context.feedback.message,
                    stack: context.feedback.stack
                }
            });
        }

        let currentParticipant = this.deviceManager.getParticipant(deviceIdentifier);

        // Update device information
        currentParticipant.updateLastSignOfLife();

        // Process subscribe topics and unsubscribe topics
        message.subscribeTopics.forEach(subscribeTopic => {
            currentParticipant.subscribe(subscribeTopic);
        });

        message.unsubscribeTopics.forEach(unsubscribeTopic => {
            currentParticipant.unsubscribe(unsubscribeTopic);
        });

        // Reply with success message
        return {
            success:{
                title: 'Success',
                message: 'Successfully processed all subscribtions.'
            }
        }
    }
}

module.exports = {
    'SubscribtionService': SubscribtionService,
}