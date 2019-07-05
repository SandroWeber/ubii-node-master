const uuidv4 = require('uuid/v4');
const namida = require('@tum-far/namida');

const {Device} = require('./device.js');

const {proto} = require('@tum-far/ubii-msg-formats');

/**
 * Participants are representations of remote entities at the server that actively interact with the ubii system.
 * They participate in the ubii system by publishing data (they produce data) and/or consuming data via subscriptions (they consume data).
 */
class Participant extends Device {
    constructor({id = uuidv4(), name = '', deviceType = undefined, components = [], clientId = undefined},
                client, 
                topicData) {
        super({id: id, name: name, deviceType: deviceType, components: components, clientId: clientId}, client);

        this.topicData = topicData;
        //this.subscriptionTokens = new Map();
    }

    /**
     * Publishes the specified information to the topicData
     * @param {*} topic 
     * @param {*} type 
     * @param {*} value 
     */
    publish(topic, type, value) {
        this.topicData.publish(topic, {
            type: type,
            value: value
        });
    }

    /**
     * Subscribe to a topic at the topicData
     * @param {String} topic 
     */
    /*subscribe(topic) {
        if (this.subscriptionTokens.has(topic)) {
            namida.logFailure(`Topic Data subscription rejected`,
                `Device (Participant) with id ${this.identifier} is already subscribed to this topic.`);
            return;
        }

        // subscribe
        let token = this.topicData.subscribe(topic, (topic, data) => {
            let payload = {
                deviceIdentifier: 'masterNode',
                topicDataRecord:{
                    topic: topic
                }
            };
            payload.topicDataRecord[data.type] = data.value;

            let buffer = this.topicDataTranslator.createBufferFromPayload(payload);

            this.sendMessageToRemote(buffer);
        });

        // save token
        this.subscriptionTokens.set(topic, token);
    }*/

    /**
     * Unsubscribes from a topic at the topicData.
     * @param {String} topic 
     */
    /*unsubscribe(topic) {
        if(this.subscriptionTokens.has(topic)){
            namida.logFailure(`Topic Data unsubscription rejected`,
                `Device (Particpiant) with id ${this.identifier} is not subscribed to this topic.`);
            return;
        }

        // get token
        let token = this.subscriptionTokens.get(topic);

        // unsubscribe
        this.topicData.unsubscribe(token);
    }*/

    /**
     * Deactivate the client: clear all intervalls, unsubsribe from all topics, ...
     * You should call this method before clearing all references to a client.
     */
    deactivate(){
        // unsubscribe all
        for(let t in this.subscriptionTokens){
            this.topicData.unsubscribe(t);
        }
    }
}

module.exports = {
    'Participant': Participant,
}