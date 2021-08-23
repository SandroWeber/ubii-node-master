const { v4: uuidv4 } = require('uuid');
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