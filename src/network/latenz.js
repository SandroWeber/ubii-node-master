const { ClientManager } = require('../clients/clientManager');

class Latenz  {

    constructor() {
        this.activePingMap = new Map();
        this.clientManager = ClientManager.instance;
    }

    addPing(cId) {
        this.activePingMap.set(cId, this.getTimeStamp(cId))
    }

    addLatenz(cId) {
        if (this.activePingMap.has(cId)) {
            let client = this.clientManager.getClient(cId);
            client.updateLatency(this.calcDiffTimeStamps(cId));
            this.activePingMap.delete(cId);
        }
    }

    getTimeStamp() {
        return new Date().getTime();
    }

    calcDiffTimeStamps(cId) {
        return this.getTimeStamp() - this.activePingMap.get(cId) 
    }
}

module.exports = new Latenz();