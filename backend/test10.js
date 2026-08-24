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
  console.log('Testing Users & Profile Module (Test 10)');
  
  const userA = await register(`usera10+${Date.now()}@example.com`, 'Pass123!', 'User A10');
  const userB = await register(`userb10+${Date.now()}@example.com`, 'Pass123!', 'User B10');
  
  console.log('Fetching initial profile');
  const profileReq1 = await request('GET', '/api/users/me', null, userA.token);
  if (!profileReq1.res.ok || !profileReq1.json.user) fail('Failed to fetch profile', 11);
  if (profileReq1.json.user._count.following !== 0) fail('Expected 0 following initially', 12);

  console.log('Testing unauthenticated profile request');
  const unauthReq = await request('GET', '/api/users/me', null, null);
  if (unauthReq.res.status !== 401) fail('Expected 401 for unauthenticated request', 13);

  console.log('Following User B from User A');
  const followReq1 = await request('POST', `/api/users/${userB.user.id}/follow`, null, userA.token);
  if (!followReq1.res.ok || followReq1.json.status !== 'followed') fail('Expected to successfully follow', 14);

  console.log('Following User B again from User A (toggle behavior)');
  const followReq2 = await request('POST', `/api/users/${userB.user.id}/follow`, null, userA.token);
  if (!followReq2.res.ok || followReq2.json.status !== 'unfollowed') fail('Expected toggle to unfollow', 15);

  console.log('Following User B a third time to restore follow state');
  const followReq3 = await request('POST', `/api/users/${userB.user.id}/follow`, null, userA.token);
  if (!followReq3.res.ok || followReq3.json.status !== 'followed') fail('Expected to successfully follow again', 16);

  console.log('Attempting to follow oneself');
  const selfReq = await request('POST', `/api/users/${userA.user.id}/follow`, null, userA.token);
  if (selfReq.res.status !== 400) fail('Expected 400 when following oneself', 17);

  console.log('Fetching updated profile');
  const profileReq2 = await request('GET', '/api/users/me', null, userA.token);
  if (profileReq2.json.user._count.following !== 1) fail(`Expected 1 following, got ${profileReq2.json.user._count.following}`, 18);

  console.log('Test 10 Passed! Users & Profile verified.');
  process.exit(0);
}

run().catch(err => {
  console.error('Test 10 error', err);
  process.exit(99);
});
