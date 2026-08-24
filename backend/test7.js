const fetch = require('node-fetch');

const BASE = 'http://127.0.0.1:4001';

function fail(msg, code = 1) {
  console.error(msg);
  process.exit(code);
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

async function register(email, password, displayName) {
  const r = await request('POST', '/api/auth/register', { email, password, displayName });
  if (!r.res.ok || !r.json.token) {
    console.error(`Registration failed. Status: ${r.res.status} ${r.res.statusText}. JSON:`, r.json);
    fail(`Register failed for ${email}`, 10);
  }
  return { token: r.json.token, user: r.json.user };
}

async function run() {
  console.log('Messaging integration test against', BASE);

  const userAEmail = `usera+${Date.now()}@example.com`;
  const userBEmail = `userb+${Date.now()}@example.com`;

  const userA = await register(userAEmail, 'Pass123!', 'User A');
  const userB = await register(userBEmail, 'Pass123!', 'User B');

  console.log('Testing missing receiverId');
  const badReq = await request('POST', '/api/messages', { content: 'hello' }, userA.token);
  if (badReq.res.status !== 400) fail('Expected 400 for missing receiverId', 11);

  console.log('Testing missing token');
  const unauthReq = await request('POST', '/api/messages', { receiverId: userB.user.id, content: 'hello' }, null);
  if (unauthReq.res.status !== 401) fail('Expected 401 for unauthenticated request', 12);

  console.log('Sending message A -> B');
  const msg1 = await request('POST', '/api/messages', {
    receiverId: userB.user.id,
    content: 'Hello User B, this is a test message!'
  }, userA.token);
  if (!msg1.res.ok || !msg1.json.message) fail('Message A->B failed', 13);
  
  console.log('Sending reply B -> A');
  const msg2 = await request('POST', '/api/messages', {
    receiverId: userA.user.id,
    content: 'Hi User A, I received your message.'
  }, userB.token);
  if (!msg2.res.ok || !msg2.json.message) fail('Message B->A failed', 14);

  console.log('Fetching thread from A perspective');
  const thread = await request('GET', `/api/messages/${userB.user.id}`, null, userA.token);
  if (!thread.res.ok || !thread.json.messages || !Array.isArray(thread.json.messages)) fail('Thread fetch failed', 15);
  
  if (thread.json.messages.length !== 2) fail(`Expected 2 messages, got ${thread.json.messages.length}`, 16);
  if (thread.json.messages[0].content !== 'Hello User B, this is a test message!') fail('Message 1 content mismatch', 17);
  if (thread.json.messages[1].content !== 'Hi User A, I received your message.') fail('Message 2 content mismatch', 18);

  console.log('Messaging integration test passed');
  process.exit(0);
}

run().catch((err) => {
  console.error('Messaging test error', err);
  process.exit(99);
});
