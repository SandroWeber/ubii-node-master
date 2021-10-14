class Latency  {

    constructor() {
        this.activePingMap = new Map();
    }

    addPing(cId) {
        this.activePingMap.set(cId, this.getTimeStamp(cId))
    }

    addLatency(c) {
        if (this.activePingMap.has(c.id)) {
            // let client = this.clientManager.getClient(cId);
            c.updateLatency(this.calcDiffTimeStamps(c.id));
            this.activePingMap.delete(c.id);
        }
    }

    getTimeStamp() {
        return new Date().getTime();
    }

    calcDiffTimeStamps(cId) {
        return this.getTimeStamp() - this.activePingMap.get(cId) 
    }
}

module.exports = new Latency();