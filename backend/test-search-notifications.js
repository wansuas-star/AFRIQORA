const fetch = require('node-fetch');
const path = require('path');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 4001;
const BASE = `http://127.0.0.1:${PORT}`;

function fail(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

async function isHealthy() {
  try {
    const res = await fetch(`${BASE}/api/health`);
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function ensureBackendServer() {
  if (await isHealthy()) return null;

  const serverPath = path.join(__dirname, 'dist', 'index.js');
  const proc = spawn(process.execPath, [serverPath], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 150));
    if (await isHealthy()) break;
  }

  return proc;
}

async function request(method, path, body, token) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function register(label) {
  const email = `${label}+${Date.now()}@example.com`;
  const password = 'TestPass123!';
  const r = await request('POST', '/api/auth/register', { email, password, displayName: label });
  if (!r.res.ok || !r.json.token) fail('Register failed for ' + label, 10);
  return { token: r.json.token, user: r.json.user };
}

async function run() {
  console.log('Testing TS Backend Unified Search & Notifications Module');
  const serverProc = await ensureBackendServer();

  try {
    const userA = await register('search-alice');
    const userB = await register('search-bob');

    // 1. Create a business profile for Alice
    console.log('1. Creating business profile for Alice');
    const bizReq = await request('POST', '/api/creator/business-profile', {
      businessName: 'Alice Solar Solutions',
      category: 'Renewable Energy',
      description: 'Clean solar installations across Nairobi and beyond.',
      location: 'Nairobi',
      country: 'KE',
      website: 'https://solar.alice.afriqora.local'
    }, userA.token);
    if (!bizReq.res.ok || !bizReq.json.businessProfile) fail('Failed to create business profile', 11);

    // 2. Create a post for Alice
    console.log('2. Creating post for Alice');
    const postReq = await request('POST', '/api/feed', {
      title: 'Top Solar Energy Trends 2026',
      text: 'Essential tips for businesses investing in renewable power.',
      category: 'Renewable Energy',
      location: 'Nairobi',
    }, userA.token);
    if (!postReq.res.ok || !postReq.json.post) fail('Failed to create post', 12);

    // 3. Perform Unified Search
    console.log('3. Searching for "solar" in unified search');
    const searchReq = await request('GET', '/api/search?q=solar&types=all', null, userB.token);
    if (!searchReq.res.ok || !searchReq.json.ok) fail('Search request failed', 13);
    const items = searchReq.json.items || [];
    console.log(`Found ${items.length} items in search results`);
    const hasBiz = items.some(i => i.type === 'businesses' && i.title.includes('Alice Solar'));
    const hasPost = items.some(i => i.type === 'posts' && i.title.includes('Solar Energy'));
    if (!hasBiz || !hasPost) fail('Expected solar business and post in search results', 14);

    // 4. Send Connection Request from Bob to Alice
    console.log('4. Bob sending connection request to Alice');
    const connReq = await request('POST', '/api/notifications/connections/request', {
      targetUserId: userA.user.id,
      message: 'Let us connect on renewable energy initiatives.'
    }, userB.token);
    if (!connReq.res.ok || !connReq.json.ok) fail('Connection request failed', 15);

    // 5. Fetch Alice notifications
    console.log('5. Fetching Alice notifications');
    const noteReq = await request('GET', '/api/notifications', null, userA.token);
    if (!noteReq.res.ok || !noteReq.json.items || noteReq.json.items.length === 0) fail('Expected notification for Alice', 16);
    const firstNote = noteReq.json.items[0];
    if (firstNote.type !== 'connection_request') fail('Expected connection_request notification type', 17);

    // 6. Alice marks notification as read
    console.log('6. Alice marking notification as read');
    const readReq = await request('POST', `/api/notifications/${firstNote.id}/read`, null, userA.token);
    if (!readReq.res.ok || !readReq.json.read) fail('Failed to mark notification read', 18);

    // 7. Alice accepts connection request
    console.log('7. Alice accepting connection request');
    const acceptReq = await request('POST', '/api/notifications/connections/respond', {
      requesterId: userB.user.id,
      accept: true
    }, userA.token);
    if (!acceptReq.res.ok || acceptReq.json.connectionRequest.status !== 'accepted') fail('Failed to accept connection', 19);

    console.log('All Unified Search & Notification tests passed successfully!');
  } finally {
    if (serverProc && !serverProc.killed) {
      try { serverProc.kill(); } catch (e) {}
    }
  }

  process.exit(0);
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(99);
});
