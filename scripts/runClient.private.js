
const yargs = require('yargs');
const { UbiiClientNode } = require('@tum-far/ubii-node-nodejs');
const JIFFClient = require('jiff-mpc/lib/jiff-client');

const argv = yargs
  .option('name', { type: 'string', demandOption: true })
  .option('x', { type: 'number', default: 0 })
  .option('y', { type: 'number', default: 0 })
  .option('threshold', { type: 'number', default: 2 })
  .option('service', { type: 'string', default: 'http://127.0.0.1:8102/services/json' })
  .option('topicdata', { type: 'string', default: 'ws://127.0.0.1:8104' })
  .argv;

(async () => {
  const ubii = new UbiiClientNode(
    argv.name,
    { address: argv.service, format: 'JSON' },
    { address: argv.topicdata }
  );
  await ubii.initialize();

  const myId = ubii.id;
  const X = Number(argv.x);
  const Y = Number(argv.y);
  const TH = Number(argv.threshold);

  console.log(`[private-client] Registered "${argv.name}"  id=${myId}`);
  console.log(`[private-client] PRIVATE coords=(${X},${Y}), threshold=${TH}`);

async function publishResult(sessionId, allowed) {
  const record = {
    topic: '/ubii/smpc/result',
    string: JSON.stringify({ sessionId, allowed })
  };

  try {
    ubii.publishRecord(record);
    console.log(`[private-client] Published result to broker:`, record);
  } catch (e) {
    console.error('[private-client] Failed to publish result via Ubii client:', e);
  }
}
  async function runSmpcSession({ sessionId, publisherId, subscriberId }) {
    const party_id =
      myId === publisherId ? 1 :
      myId === subscriberId ? 2 :
      (() => { throw new Error('This client is neither publisher nor subscriber'); })();

    console.log(`[private-client] Starting JIFF session=${sessionId} as party_id=${party_id}`);

    const jiff = new JIFFClient('http://localhost:8080', sessionId, {
      party_count: 2,
      party_id,
      crypto_provider: true,
      autoReconnect: false
    });

    return new Promise((resolve) => {
      let once = false;
      jiff.wait_for([1, 2], async () => {
        if (once) return; once = true;
        try {
          const coordShares = await jiff.share_array([X, Y]);
          const Ax = coordShares[1][0];
          const Ay = coordShares[1][1];
          const Bx = coordShares[2][0];
          const By = coordShares[2][1];
          const dx = Ax.ssub(Bx);
          const dy = Ay.ssub(By);
          const dist2 = dx.smult(dx).sadd(dy.smult(dy));
          const thShares = await jiff.share_array([TH * TH]);
          const thA = thShares[1][0];
          const thB = thShares[2][0];
          const a_gt_b = thA.sgt(thB);
          const diff = thB.ssub(thA);
          const minTh = thA.sadd(a_gt_b.smult(diff));
          const isClose = dist2.slt(minTh).sadd(dist2.seq(minTh));
          const result = await jiff.open(isClose, [1, 2]);
          const allowed = result === 1;
          console.log(`[private-client] Proximity result = ${allowed ? 'CLOSE' : 'FAR'}`);
          await publishResult(sessionId, allowed);

          jiff.disconnect(true);
          resolve();
        } catch (err) {
          console.error('[private-client] SMPC error:', err);
          await publishResult(sessionId, false);
          try { jiff.disconnect(true); } catch {}
          resolve();
        }
      });
    });
  }
  async function subscribeControl() {
    const handler = async (topicDataRecord) => {
      try {
        const data = topicDataRecord && topicDataRecord.string
          ? JSON.parse(topicDataRecord.string)
          : null;
        if (!data || data.type !== 'SMPC_START_PROXIMITY') return;

        const { sessionId, publisherId, subscriberId } = data;
        if (myId !== publisherId && myId !== subscriberId) return;

        await runSmpcSession({ sessionId, publisherId, subscriberId });
      } catch (e) {
        console.error('[private-client] control handler error:', e);
      }
    };

    try {
      await ubii.subscribeTopic('/ubii/smpc/control', handler);
    } catch (e) {
      try {
        await ubii.subscribe('/ubii/smpc/control', handler);
      } catch (e2) {
        console.error('[private-client] Could not subscribe to /ubii/smpc/control. Please adapt subscribeControl() to your SDK.', e2);
      }
    }
  }

  await subscribeControl();

  console.log('[private-client] Ready. Waiting for SMPC control messages...');
  process.stdin.resume();
})();
