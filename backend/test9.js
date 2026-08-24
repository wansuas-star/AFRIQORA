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
  console.log('Testing Feed & Post Creation (Test 9)');
  
  const userEmail = `user9+${Date.now()}@example.com`;
  const user = await register(userEmail, 'Pass123!', 'User 9');
  
  console.log('Testing missing content in post');
  const badReq = await request('POST', '/api/feed', { title: 'Missing Content' }, user.token);
  if (badReq.res.status !== 400) fail('Expected 400 for missing content', 11);

  console.log('Testing unauthenticated request');
  const unauthReq = await request('GET', '/api/feed/home', null, null);
  if (unauthReq.res.status !== 401) fail('Expected 401 for unauthenticated request', 12);

  console.log('Creating valid post');
  const postReq = await request('POST', '/api/feed', {
    title: 'Welcome to AFRIQORA',
    content: 'This is my first post on the new platform!',
    mediaUrl: 'https://example.com/image.jpg',
    contentType: 'post'
  }, user.token);
  
  if (!postReq.res.ok || !postReq.json.post) fail('Post creation failed', 13);
  if (postReq.json.post.authorId !== user.user.id) fail('Post authorId mismatch', 14);

  console.log('Fetching home feed');
  const feedReq = await request('GET', '/api/feed/home', null, user.token);
  if (!feedReq.res.ok || !feedReq.json.posts || !Array.isArray(feedReq.json.posts)) fail('Feed fetch failed', 15);
  
  const createdPost = feedReq.json.posts.find(p => p.id === postReq.json.post.id);
  if (!createdPost) fail('Created post not found in home feed', 16);
  
  if (!createdPost.author || createdPost.author.displayName !== 'User 9') fail('Author relational data missing or incorrect', 17);
  if (typeof createdPost._count.likes !== 'number' || typeof createdPost._count.comments !== 'number') fail('Aggregated counts missing', 18);

  console.log('Test 9 Passed! Feed & Post Creation verified.');
  process.exit(0);
}

run().catch(err => {
  console.error('Test 9 error', err);
  process.exit(99);
});
