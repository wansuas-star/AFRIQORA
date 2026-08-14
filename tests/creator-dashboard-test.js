const fetch = require('node-fetch');

const BASE = process.env.BASE || 'http://localhost:4000';

function assert(condition, message, code = 2) {
  if (!condition) {
    console.error(message);
    process.exit(code);
  }
}

function extractCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  return setCookieHeader.split(';')[0];
}

async function postJson(path, body, cookie) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(BASE + path, { method: 'POST', headers, body: JSON.stringify(body || {}) });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function putJson(path, body, cookie) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(BASE + path, { method: 'PUT', headers, body: JSON.stringify(body || {}) });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function del(path, cookie) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(BASE + path, { method: 'DELETE', headers });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function get(path, cookie) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(BASE + path, { headers });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function register(email, password, displayName) {
  const { res, json } = await postJson('/auth/register', { email, password, displayName });
  assert(res.ok && json.ok, 'Register failed for ' + email + ': ' + JSON.stringify(json), 3);
  const cookie = extractCookie(res.headers.get('set-cookie'));
  assert(cookie, 'No session cookie for register ' + email, 4);
  assert(json.user && json.user.afriqoraId, 'Missing afriqoraId in register response', 5);
  return { cookie, user: json.user };
}

async function run() {
  try {
    const emailA = `creatorA+${Date.now()}@example.com`;
    const emailB = `creatorB+${Date.now()}@example.com`;
    const password = 'TestPass123!';

    console.log('Registering creator A');
    const a = await register(emailA, password, 'Creator A');

    const meA = await get('/auth/me', a.cookie);
    assert(meA.res.ok && meA.json.user, 'Auth/me failed for creator A', 6);
    assert(meA.json.user.afriqoraId, 'Auth/me missing afriqoraId', 7);
    assert(typeof meA.json.user.passwordHash === 'undefined', 'passwordHash leaked in /auth/me response', 8);

    console.log('Saving business profile');
    const business = await postJson('/creator/business-profile', {
      businessName: 'Creator A Business',
      ownerDisplayName: 'Creator A',
      category: 'Services',
      location: 'Johannesburg',
      website: 'https://example.com',
      contact: '+27123456789',
      description: 'Creator business profile test'
    }, a.cookie);
    assert(business.res.ok && business.json.ok, 'Business profile save failed: ' + JSON.stringify(business.json), 9);

    console.log('Creating creator post');
    const created = await postJson('/creator/posts', {
      title: 'My Test Post',
      content: 'Creator dashboard post content',
      category: 'Marketing',
      location: 'Johannesburg',
      website: 'https://example.com',
      contact: '+27123456789',
      status: 'published'
    }, a.cookie);
    assert(created.res.status === 201 && created.json.ok, 'Create post failed: ' + JSON.stringify(created.json), 10);
    const postId = created.json.post && created.json.post.id;
    assert(postId, 'Create post missing id', 11);

    console.log('Reading dashboard and my posts');
    const dash = await get('/creator/dashboard', a.cookie);
    assert(dash.res.ok && dash.json.ok, 'Dashboard read failed: ' + JSON.stringify(dash.json), 12);
    assert(dash.json.user && dash.json.user.afriqoraId, 'Dashboard missing user afriqoraId', 13);
    assert(Array.isArray(dash.json.posts) && dash.json.posts.find(p => String(p.id) === String(postId)), 'Dashboard missing created post', 14);

    const mine = await get('/creator/posts/mine', a.cookie);
    assert(mine.res.ok && mine.json.ok, 'Mine posts failed: ' + JSON.stringify(mine.json), 15);

    console.log('Editing own post');
    const edited = await putJson('/creator/posts/' + encodeURIComponent(String(postId)), {
      title: 'My Updated Test Post',
      content: 'Updated content',
      category: 'Marketing',
      location: 'Cape Town',
      status: 'published'
    }, a.cookie);
    assert(edited.res.ok && edited.json.ok, 'Edit post failed: ' + JSON.stringify(edited.json), 16);

    console.log('Registering creator B and testing ownership guard');
    const b = await register(emailB, password, 'Creator B');
    const forbiddenDelete = await del('/creator/posts/' + encodeURIComponent(String(postId)), b.cookie);
    assert(forbiddenDelete.res.status === 403, 'Ownership guard failed, expected 403 on delete', 17);

    console.log('Deleting own post');
    const deleted = await del('/creator/posts/' + encodeURIComponent(String(postId)), a.cookie);
    assert(deleted.res.ok && deleted.json.ok, 'Delete own post failed: ' + JSON.stringify(deleted.json), 18);

    const mineAfterDelete = await get('/creator/posts/mine', a.cookie);
    assert(mineAfterDelete.res.ok && mineAfterDelete.json.ok, 'Mine posts after delete failed', 19);
    assert(!mineAfterDelete.json.posts.find(p => String(p.id) === String(postId)), 'Post still present after delete', 20);

    console.log('Creator dashboard/API tests passed');
    process.exit(0);
  } catch (e) {
    console.error('Creator dashboard test error', e);
    process.exit(99);
  }
}

run();
