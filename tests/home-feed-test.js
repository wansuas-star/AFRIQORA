const fetch = require('node-fetch');

const BASE = process.env.BASE || 'http://localhost:4010';
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-me-in-production';
const SAFE_IMAGE_DATA_URL = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#145f7d"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#f7fbff" font-size="18" font-family="Arial">AFRIQORA Test Image</text></svg>');
const SAFE_VIDEO_DATA_URL = 'data:video/mp4;base64,AAAA';

function extractCookie(setCookie) {
  if (!setCookie) return '';
  return String(setCookie).split(';')[0] || '';
}

function assert(ok, msg, code) {
  if (!ok) {
    console.error(msg);
    process.exit(code || 1);
  }
}

async function post(path, body, cookie, headers = {}) {
  const h = Object.assign({ 'Content-Type': 'application/json' }, headers);
  if (cookie) h.Cookie = cookie;
  const res = await fetch(BASE + path, { method: 'POST', headers: h, body: JSON.stringify(body || {}) });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function put(path, body, cookie, headers = {}) {
  const h = Object.assign({ 'Content-Type': 'application/json' }, headers);
  if (cookie) h.Cookie = cookie;
  const res = await fetch(BASE + path, { method: 'PUT', headers: h, body: JSON.stringify(body || {}) });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function get(path, cookie, headers = {}) {
  const h = Object.assign({}, headers);
  if (cookie) h.Cookie = cookie;
  const res = await fetch(BASE + path, { method: 'GET', headers: h });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function register(name) {
  const email = `${name}+${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const password = 'TestPass123!';
  const { res, json } = await post('/auth/register', { email, password, displayName: name });
  assert(res.ok && json.ok && json.user, 'register failed for ' + name, 11);
  const cookie = extractCookie(res.headers.get('set-cookie'));
  assert(cookie, 'missing cookie for ' + name, 12);
  return { cookie, user: json.user };
}

async function run() {
  console.log('Home feed integration test against', BASE);

  const creator = await register('home-creator');
  const viewer = await register('home-viewer');

  const cfg = await put('/smart-reach/config', {
    initialPoolSize: 30,
    expandedPoolSize: 90,
    discoveryPoolSize: 120,
    stageThresholds: {
      initialToExpandedMinImpressions: 2,
      initialToExpandedMinScore: 0.1,
      expandedToDiscoveryMinImpressions: 5,
      expandedToDiscoveryMinScore: 0.12
    }
  }, null, { 'x-admin-key': ADMIN_KEY });
  assert(cfg.res.ok && cfg.json.ok, 'smart reach config failed', 13);

  const follow = await post('/follow', { creatorId: creator.user.afriqoraId, followerId: viewer.user.id }, viewer.cookie);
  assert(follow.res.ok && follow.json.ok, 'follow failed', 14);

  console.log('Create text, image and video/business-capable posts');
  const textPost = await post('/creator/posts', {
    title: 'Home Feed Text',
    content: 'Text content for home feed ordering test',
    category: 'Business Strategy',
    location: 'Nairobi',
    topics: ['strategy', 'operations'],
    status: 'published'
  }, creator.cookie);
  assert(textPost.res.ok && textPost.json.ok && textPost.json.post, 'text post failed', 15);

  const imagePost = await post('/creator/posts', {
    title: 'Home Feed Image',
    content: 'Image post for feed media rendering',
    category: 'Design',
    location: 'Nairobi',
    image: SAFE_IMAGE_DATA_URL,
    status: 'published'
  }, creator.cookie);
  assert(imagePost.res.ok && imagePost.json.ok && imagePost.json.post, 'image post failed', 16);

  const videoPost = await post('/creator/posts', {
    title: 'Home Feed Video',
    content: 'Video post for playback/engagement tests',
    category: 'Business Strategy',
    location: 'Nairobi',
    video: SAFE_VIDEO_DATA_URL,
    status: 'published'
  }, creator.cookie);
  assert(videoPost.res.ok && videoPost.json.ok && videoPost.json.post, 'video post failed', 17);

  const videoId = String(videoPost.json.post.id);

  const home1 = await get('/feed/home?limit=2', viewer.cookie);
  assert(home1.res.ok && home1.json.ok, 'feed/home page1 failed', 18);
  assert(Array.isArray(home1.json.items), 'feed/home page1 invalid items', 19);
  assert(home1.json.items.length > 0, 'feed/home returned empty for authenticated viewer', 20);
  assert(home1.json.items.every((x) => typeof x.recommendationScore === 'number'), 'recommendation scores missing', 21);

  assert(home1.json.hasMore === true, 'pagination hasMore expected true', 22);
  assert(typeof home1.json.nextCursor === 'number', 'pagination nextCursor missing', 23);

  const home2 = await get('/feed/home?limit=2&cursor=' + encodeURIComponent(String(home1.json.nextCursor)), viewer.cookie);
  assert(home2.res.ok && home2.json.ok, 'feed/home page2 failed', 24);
  assert(Array.isArray(home2.json.items), 'feed/home page2 invalid items', 25);

  console.log('Engagement actions: likes/comments/shares/saves/views/watch/completion/not interested/report');

  const like = await post('/interactions/like', { videoId, userId: viewer.user.id }, viewer.cookie);
  assert(like.res.ok && like.json.ok, 'like failed', 26);

  const comment = await post('/comments', { videoId, authorId: viewer.user.id, text: 'Strong post' }, viewer.cookie);
  assert(comment.res.ok && comment.json.ok, 'comment failed', 27);

  const share = await post('/interactions/share', { videoId, userId: viewer.user.id, platform: 'native' }, viewer.cookie);
  assert(share.res.ok && share.json.ok, 'share failed', 28);

  const save = await post('/interactions/save', { videoId }, viewer.cookie);
  assert(save.res.ok && save.json.ok && save.json.saved === true, 'save failed', 29);

  const savesQuery = await get('/interactions/saves?videoId=' + encodeURIComponent(videoId), viewer.cookie);
  assert(savesQuery.res.ok && savesQuery.json.ok && savesQuery.json.saved === true, 'save status failed', 30);

  const imp = await post('/smart-reach/engagement', { contentId: videoId, eventType: 'impression' }, viewer.cookie);
  assert(imp.res.ok && imp.json.ok, 'impression event failed', 31);

  const view = await post('/smart-reach/engagement', { contentId: videoId, eventType: 'view' }, viewer.cookie);
  assert(view.res.ok && view.json.ok, 'view event failed', 32);

  const watch = await post('/smart-reach/engagement', { contentId: videoId, eventType: 'watch_time', watchTimeMs: 19000 }, viewer.cookie);
  assert(watch.res.ok && watch.json.ok, 'watch_time event failed', 33);

  const complete = await post('/smart-reach/engagement', { contentId: videoId, eventType: 'completion' }, viewer.cookie);
  assert(complete.res.ok && complete.json.ok, 'completion event failed', 34);

  const report = await post('/content/report', { contentId: videoId, reason: 'test report' }, viewer.cookie);
  assert(report.res.ok && report.json.ok, 'report failed', 35);

  const analytics = await get('/analytics/content/' + encodeURIComponent(videoId), creator.cookie);
  assert(analytics.res.ok && analytics.json.ok, 'content analytics failed', 36);
  assert(Number((analytics.json.reach || {}).views || 0) >= 1, 'analytics views not updated', 37);
  assert(Number((analytics.json.reach || {}).saves || 0) >= 1, 'analytics saves not updated', 38);

  const notInterested = await post('/content/not-interested', { contentId: videoId, reason: 'not relevant' }, viewer.cookie);
  assert(notInterested.res.ok && notInterested.json.ok, 'not interested failed', 39);

  const afterNI = await get('/feed/home?limit=20', viewer.cookie);
  assert(afterNI.res.ok && afterNI.json.ok, 'feed after not-interested failed', 40);
  assert(!afterNI.json.items.some((x) => String(x.id) === videoId), 'not interested content still in feed', 41);

  const block = await post('/users/block', { targetUserId: creator.user.id }, viewer.cookie);
  assert(block.res.ok && block.json.ok, 'block failed', 42);

  const afterBlock = await get('/feed/home?limit=20', viewer.cookie);
  assert(afterBlock.res.ok && afterBlock.json.ok, 'feed after block failed', 43);
  assert(!afterBlock.json.items.some((x) => String(x.ownerUserId) === String(creator.user.id)), 'blocked user content still visible', 44);

  console.log('Home feed integration test passed');
  process.exit(0);
}

run().catch((err) => {
  console.error('Home feed test error', err);
  process.exit(99);
});
