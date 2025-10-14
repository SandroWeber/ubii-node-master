
const { JIFFClient } = require('jiff-mpc');

class SMPCClientAgent {
  constructor(client, topicData) {
    this.client = client;
    this.topicData = topicData;
    this.jiff = null;
    this.sessionId = null;

    try {
      this.topicData.subscribeTopic('/ubii/smpc/control', (record) => {
        try {
          const msg = JSON.parse(record.string);
          this.handleControlMessage(msg).catch((err) => {
            console.error('[SMPCClientAgent] handleControlMessage error:', err);
          });
        } catch (err) {
          console.error('[SMPCClientAgent] Failed to parse control message:', err);
        }
      });
    } catch (err) {
      console.error('[SMPCClientAgent] Failed to subscribe to smpc control topic:', err);
    }
  }

  async handleControlMessage(msg) {
    if (!msg || msg.type !== 'SMPC_START_PROXIMITY') return;

    const { sessionId, publisherId, subscriberId } = msg;
    if (![publisherId, subscriberId].includes(this.client.id)) return;

    console.log(`[SMPCClientAgent] Client ${this.client.id} joining SMPC session ${sessionId}`);
    if (this.jiff && this.sessionId === sessionId) {
      console.warn(`[SMPCClientAgent] Client ${this.client.id} already has JIFF instance for ${sessionId}, skipping.`);
      return;
    }

    this.sessionId = sessionId;

    const myNumericId =
      this.client.id === publisherId ? 1 :
      this.client.id === subscriberId ? 2 :
      (() => { throw new Error('This client is neither publisher nor subscriber for this SMPC session'); })();

    const jiffOptions = {
      party_count: 2,
      party_id: myNumericId,
      crypto_provider: true,
      autoReconnect: false
    };

    try {
      this.jiff = new JIFFClient('http://localhost:8080', sessionId, jiffOptions);

      this.jiff.wait_for([1, 2], async () => {
        console.log(`[SMPCClientAgent] JIFF connected for session ${sessionId}`);
        try {
          await this._doShareOpenFlow();
        } catch (err) {
          console.error('[SMPCClientAgent] Error during MPC computation:', err);
          this.topicData.publish('/ubii/smpc/result', {
            topic: '/ubii/smpc/result',
            string: JSON.stringify({ sessionId, allowed: false, fallback: true })
          });
        }
      });
    } catch (err) {
      console.error('[SMPCClientAgent] Failed to construct JIFF client:', err);
      this.jiff = null;
    }
  }
  parseParamsFromName(name) {
    const out = { x: 0, y: 0, t: 2 };
    if (typeof name !== 'string') return out;
    const parts = name.split('|').slice(1);
    for (const p of parts) {
      const [k, v] = p.split('=');
      if (k && v) {
        if (k === 'x') out.x = Number(v);
        else if (k === 'y') out.y = Number(v);
        else if (k === 't') out.t = Number(v);
      }
    }
    return out;
  }

  async _doShareOpenFlow() {
    if (!this.jiff) throw new Error('_doShareOpenFlow called without valid jiff client');
    const { x, y, t } = this.parseParamsFromName(this.client.name);
    const threshold = Number.isFinite(t) ? t : 2;
 console.log(`[SMPCClientAgent] Using inputs from name: (${x}, ${y}), threshold=${threshold}`);

    try {
      const coordShares = await this.jiff.share_array([x, y]);
      const Ax = coordShares[1][0];
      const Ay = coordShares[1][1];
      const Bx = coordShares[2][0];
      const By = coordShares[2][1];
      const dx = Ax.ssub(Bx);
      const dy = Ay.ssub(By);
      const dist2 = dx.smult(dx).sadd(dy.smult(dy));
      const thShares = await this.jiff.share_array([threshold * threshold]);
      const thA = thShares[1][0];
      const thB = thShares[2][0];
      const a_gt_b = thA.sgt(thB);
      const diff = thB.ssub(thA);
      const minTh = thA.sadd(a_gt_b.smult(diff));
      const isClose = dist2.slt(minTh).sadd(dist2.seq(minTh));
      const result = await this.jiff.open(isClose, [1, 2]);
console.log(`[SMPCClientAgent] Proximity result = ${result === 1 ? 'CLOSE' : 'FAR'}`);
      const msg = {
        topic: '/ubii/smpc/result',
        string: JSON.stringify({ sessionId: this.sessionId, allowed: result === 1 })
      };
      console.log('[SMPCClientAgent] Publishing result:', msg);
      this.topicData.publish('/ubii/smpc/result', msg);
    } catch (err) {
      console.error('[SMPCClientAgent] Error in MPC computation:', err);
      this.topicData.publish('/ubii/smpc/result', {
        topic: '/ubii/smpc/result',
        string: JSON.stringify({ sessionId: this.sessionId, allowed: false, error: true })
      });
    } finally {
      this.jiff.disconnect(true);
      this.jiff = null;
      this.sessionId = null;
    }
  }
}

module.exports = SMPCClientAgent;
