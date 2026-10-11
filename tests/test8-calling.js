const WebSocket = require('ws');
const path = require('path');
const { spawn } = require('child_process');

const SIGNALING_PORT = process.env.SIGNALING_PORT || 8080;
const SIGNALING_URL = `ws://localhost:${SIGNALING_PORT}`;

function fail(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

function connect(clientId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(SIGNALING_URL);
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'register', clientId }));
    });
    
    const client = { ws, clientId, messages: [] };
    
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      client.messages.push(msg);
      if (msg.type === 'registered') {
        resolve(client);
      }
      if (client.onMessage) {
        client.onMessage(msg);
      }
    });
    
    ws.on('error', reject);
  });
}

async function ensureSignalingServer() {
  // Check if signaling server is running
  const isUp = await new Promise((resolve) => {
    const testWs = new WebSocket(SIGNALING_URL);
    testWs.on('open', () => {
      testWs.close();
      resolve(true);
    });
    testWs.on('error', () => resolve(false));
  });

  if (isUp) return null;

  // Auto-spawn signaling server for the test
  const serverPath = path.join(__dirname, '..', 'server', 'signaling-server.js');
  const proc = spawn(process.execPath, [serverPath], {
    env: { ...process.env, PORT: String(SIGNALING_PORT) },
    stdio: 'ignore'
  });

  // Wait for it to become ready
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 100));
    const ready = await new Promise(resolve => {
      const testWs = new WebSocket(SIGNALING_URL);
      testWs.on('open', () => {
        testWs.close();
        resolve(true);
      });
      testWs.on('error', () => resolve(false));
    });
    if (ready) break;
  }

  return proc;
}

async function run() {
  console.log('Testing WebRTC Call Rejection (Test 8)');
  const serverProc = await ensureSignalingServer();
  
  try {
    // 1. Setup User A and User B
    const userA = await connect('userA-123').catch(() => fail('Could not connect User A'));
    const userB = await connect('userB-456').catch(() => fail('Could not connect User B'));
    
    console.log('User A and User B connected and registered.');

    // 2. User A sends offer to User B
    const offerMsg = {
      type: 'offer',
      to: userB.clientId,
      from: userA.clientId,
      offer: { sdp: 'dummy-sdp-offer' }
    };
    
    const offerReceivedPromise = new Promise(resolve => {
      userB.onMessage = (msg) => {
        if (msg.type === 'offer') resolve(msg);
      };
    });

    console.log('User A sending call offer...');
    userA.ws.send(JSON.stringify(offerMsg));
    
    const receivedOffer = await offerReceivedPromise;
    console.log('User B received offer from', receivedOffer.from);

    // 3. User B declines the call
    const declineMsg = {
      type: 'decline',
      to: userA.clientId,
      from: userB.clientId
    };
    
    const declineReceivedPromise = new Promise(resolve => {
      userA.onMessage = (msg) => {
        if (msg.type === 'decline') resolve(msg);
      };
    });

    console.log('User B declining call...');
    userB.ws.send(JSON.stringify(declineMsg));
    
    const receivedDecline = await declineReceivedPromise;
    console.log('User A received decline from', receivedDecline.from);
    
    if (receivedDecline.type !== 'decline') fail('Expected decline message');
    
    console.log('Test 8 Passed! Call Rejection signaling verified.');
    
    userA.ws.close();
    userB.ws.close();
  } finally {
    if (serverProc && !serverProc.killed) {
      try { serverProc.kill(); } catch (e) {}
    }
  }

  process.exit(0);
}

run().catch(err => {
  console.error('Test 8 error', err);
  process.exit(99);
});
