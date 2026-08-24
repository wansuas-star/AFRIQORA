const fetch = require('node-fetch');

const BASE = process.env.BASE || 'http://localhost:4010';
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-me-in-production';
const SAFE_VIDEO_DATA_URL = 'data:video/mp4;base64,AAAA';

function extractCookie(setCookie) {
  if (!setCookie) return '';
  const first = String(setCookie).split(';')[0];
  return first || '';
}

function fail(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

async function postJson(path, body, cookie, extraHeaders = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, extraHeaders);
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(BASE + path, { method: 'POST', headers, body: JSON.stringify(body || {}) });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function putJson(path, body, cookie, extraHeaders = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, extraHeaders);
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(BASE + path, { method: 'PUT', headers, body: JSON.stringify(body || {}) });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function getJson(path, cookie, extraHeaders = {}) {
  const headers = Object.assign({}, extraHeaders);
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(BASE + path, { method: 'GET', headers });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function registerUser(label) {
  const email = `${label}+${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const password = 'TestPass123!';
  const { res, json } = await postJson('/auth/register', { email, password, displayName: label });
  if (!res.ok || !json.ok || !json.user) fail(`register failed for ${label}: ${JSON.stringify(json)}`, 11);
  const cookie = extractCookie(res.headers.get('set-cookie'));
  if (!cookie) fail(`missing session cookie for ${label}`, 12);
  return { cookie, user: json.user, email, password };
}

async function run() {
  console.log('Smart Reach test using', BASE);

  const author = await registerUser('smart-author');
  const viewerA = await registerUser('smart-viewer-a');
  const viewerB = await registerUser('smart-viewer-b');
  const viewerC = await registerUser('smart-viewer-c');

  const moreViewers = [];
  for (let i = 0; i < 4; i += 1) {
    moreViewers.push(await registerUser(`smart-viewer-extra-${i}`));
  }

  console.log('Configuring Smart Reach thresholds for deterministic test expansion');
  const cfg = await putJson('/smart-reach/config', {
    stageThresholds: {
      initialToExpandedMinImpressions: 4,
      initialToExpandedMinScore: 0.2,
      expandedToDiscoveryMinImpressions: 8,
      expandedToDiscoveryMinScore: 0.25
    },
    initialPoolSize: 20,
    expandedPoolSize: 80,
    discoveryPoolSize: 160,
    maxFeedItemsPerAuthor: 4
  }, null, { 'x-admin-key': ADMIN_KEY });
  if (!cfg.res.ok || !cfg.json.ok) fail('failed to configure smart reach', 13);

  console.log('Saving business profile for author');
  const business = await postJson('/creator/business-profile', {
    businessName: 'Smart Reach Biz',
    ownerDisplayName: 'Smart Author',
    category: 'Marketing',
    location: 'Johannesburg',
    website: 'https://example.com',
    contact: '+2711000111',
    description: 'Business profile for recommendation tests'
  }, author.cookie);
  if (!business.res.ok || !business.json.ok) fail('business profile save failed', 14);

  console.log('Creating follow links for initial distribution pool');
  const followers = [viewerA, viewerB, viewerC].concat(moreViewers);
  for (const follower of followers) {
    const follow = await postJson('/follow', {
      creatorId: String(author.user.afriqoraId),
      followerId: String(follower.user.id)
    }, follower.cookie);
    if (!follow.res.ok || !follow.json.ok) fail('follow failed for ' + follower.user.id, 15);
  }

  console.log('Creating text post and video post');
  const postA = await postJson('/creator/posts', {
    title: 'Smart Reach Text Post',
    content: 'AFRIQORA original content distribution test',
    category: 'Marketing',
    topics: ['lead generation', 'b2b'],
    location: 'Johannesburg',
    status: 'published'
  }, author.cookie);
  if (!postA.res.ok || !postA.json.ok || !postA.json.post) fail('text post create failed', 16);

  const postVideo = await postJson('/creator/posts', {
    title: 'Smart Reach Video Post',
    content: 'Video distribution quality test',
    category: 'Marketing',
    topics: ['video strategy', 'creator growth'],
    location: 'Johannesburg',
    video: SAFE_VIDEO_DATA_URL,
    status: 'published'
  }, author.cookie);
  if (!postVideo.res.ok || !postVideo.json.ok || !postVideo.json.post) fail('video post create failed', 17);

  const textPostId = String(postA.json.post.id);
  const videoPostId = String(postVideo.json.post.id);

  console.log('Verifying content processing metadata');
  const contentMeta = await getJson('/smart-reach/content/' + encodeURIComponent(videoPostId), author.cookie);
  if (!contentMeta.res.ok || !contentMeta.json.ok || !contentMeta.json.content) fail('smart reach content lookup failed', 18);
  if (contentMeta.json.content.contentType !== 'video') fail('video content type not stored correctly', 19);
  if (!contentMeta.json.content.publishedAt) fail('publishedAt missing', 20);

  console.log('Testing initial distribution in home feed');
  const homeBefore = await getJson('/feed/home?limit=20', viewerA.cookie);
  if (!homeBefore.res.ok || !homeBefore.json.ok || !Array.isArray(homeBefore.json.items)) fail('home feed fetch failed', 21);
  const hasVideoInitially = homeBefore.json.items.some((x) => String(x.id) === videoPostId);
  if (!hasVideoInitially) fail('initial distribution did not include followed author content', 22);

  console.log('Recording genuine engagement signals');
  const engagementEvents = [
    { eventType: 'impression' },
    { eventType: 'view' },
    { eventType: 'watch_time', watchTimeMs: 18000 },
    { eventType: 'completion' },
    { eventType: 'profile_visit' },
    { eventType: 'save' }
  ];
  for (const ev of engagementEvents) {
    const eventRes = await postJson('/smart-reach/engagement', Object.assign({ contentId: videoPostId }, ev), viewerA.cookie);
    if (!eventRes.res.ok || !eventRes.json.ok) fail('engagement event failed: ' + ev.eventType, 23);
  }

  const likeRes = await postJson('/interactions/like', { videoId: videoPostId, userId: viewerA.user.id }, viewerA.cookie);
  if (!likeRes.res.ok || !likeRes.json.ok) fail('legacy like failed', 24);
  const commentRes = await postJson('/comments', { videoId: videoPostId, authorId: viewerA.user.id, text: 'Great business video' }, viewerA.cookie);
  if (!commentRes.res.ok || !commentRes.json.ok) fail('comment failed', 25);
  const shareRes = await postJson('/interactions/share', { videoId: videoPostId, userId: viewerA.user.id, platform: 'native' }, viewerA.cookie);
  if (!shareRes.res.ok || !shareRes.json.ok) fail('share failed', 26);

  console.log('Triggering stage expansion with additional real viewers');
  const viewersForExpansion = [viewerB, viewerC].concat(moreViewers);
  for (const viewer of viewersForExpansion) {
    await postJson('/smart-reach/engagement', { contentId: videoPostId, eventType: 'impression' }, viewer.cookie);
    await postJson('/smart-reach/engagement', { contentId: videoPostId, eventType: 'view' }, viewer.cookie);
    await postJson('/smart-reach/engagement', { contentId: videoPostId, eventType: 'watch_time', watchTimeMs: 12000 }, viewer.cookie);
    await postJson('/smart-reach/engagement', { contentId: videoPostId, eventType: 'completion' }, viewer.cookie);
  }

  const contentAfter = await getJson('/smart-reach/content/' + encodeURIComponent(videoPostId), author.cookie);
  if (!contentAfter.res.ok || !contentAfter.json.ok || !contentAfter.json.smartReach) fail('content metadata missing after engagement', 27);
  const stage = String(contentAfter.json.smartReach.stage || 'initial');
  if (stage !== 'expanded' && stage !== 'discovery') fail('stage did not expand after strong engagement', 28);

  console.log('Validating analytics endpoint');
  const analytics = await getJson('/analytics/content/' + encodeURIComponent(videoPostId), author.cookie);
  if (!analytics.res.ok || !analytics.json.ok) fail('content analytics fetch failed', 29);
  if (Number((analytics.json.reach || {}).impressions || 0) < 4) fail('impressions not captured', 30);
  if (Number((analytics.json.reach || {}).views || 0) < 3) fail('views not captured', 31);

  console.log('Testing not-interested filtering');
  const ni = await postJson('/content/not-interested', { contentId: videoPostId, reason: 'not relevant' }, viewerB.cookie);
  if (!ni.res.ok || !ni.json.ok) fail('not interested endpoint failed', 32);
  const feedAfterNI = await getJson('/feed/home?limit=30', viewerB.cookie);
  if (!feedAfterNI.res.ok || !feedAfterNI.json.ok) fail('home feed fetch after not interested failed', 33);
  if (feedAfterNI.json.items.some((x) => String(x.id) === videoPostId)) fail('not interested content still present in feed', 34);

  console.log('Testing blocked users filtering');
  const block = await postJson('/users/block', { targetUserId: author.user.id }, viewerC.cookie);
  if (!block.res.ok || !block.json.ok) fail('block user endpoint failed', 35);
  const feedAfterBlock = await getJson('/feed/home?limit=30', viewerC.cookie);
  if (!feedAfterBlock.res.ok || !feedAfterBlock.json.ok) fail('home feed fetch after block failed', 36);
  if (feedAfterBlock.json.items.some((x) => String(x.ownerUserId) === String(author.user.id))) fail('blocked author content still present', 37);

  console.log('Testing pagination');
  for (let i = 0; i < 4; i += 1) {
    const created = await postJson('/creator/posts', {
      title: `Smart Reach Extra Post ${i + 1}`,
      content: `Extra post ${i + 1} for pagination`,
      category: 'Marketing',
      location: 'Johannesburg',
      status: 'published'
    }, author.cookie);
    if (!created.res.ok || !created.json.ok) fail('extra post create failed ' + i, 38);
  }

  const p1 = await getJson('/feed/home?limit=2', viewerA.cookie);
  if (!p1.res.ok || !p1.json.ok || !Array.isArray(p1.json.items)) fail('pagination page1 failed', 39);
  if (!p1.json.hasMore || typeof p1.json.nextCursor === 'undefined' || p1.json.nextCursor === null) fail('pagination hasMore/nextCursor not set', 40);
  const p2 = await getJson('/feed/home?limit=2&cursor=' + encodeURIComponent(String(p1.json.nextCursor)), viewerA.cookie);
  if (!p2.res.ok || !p2.json.ok || !Array.isArray(p2.json.items)) fail('pagination page2 failed', 41);

  console.log('Confirming settings persistence unaffected');
  const putSettings = await putJson('/settings/preferences', {
    settings: {
      privacy: { twoFactor: true, profileVisibility: 'public', sessionTimeout: '30m', locationSharing: true },
      notifications: { email: true, push: true, creatorActivity: true, securityAlerts: true, digestFrequency: 'daily' }
    }
  }, viewerA.cookie);
  if (!putSettings.res.ok || !putSettings.json.ok) fail('settings put failed', 42);
  const getSettings = await getJson('/settings/preferences', viewerA.cookie);
  if (!getSettings.res.ok || !getSettings.json.ok || !getSettings.json.settings) fail('settings get failed', 43);
  if (!getSettings.json.settings.privacy || getSettings.json.settings.privacy.twoFactor !== true) fail('settings value mismatch after smart reach changes', 44);

  console.log('Testing recommendation admin analytics summary');
  const recAnalytics = await getJson('/analytics/recommendation', null, { 'x-admin-key': ADMIN_KEY });
  if (!recAnalytics.res.ok || !recAnalytics.json.ok) fail('recommendation analytics failed', 45);

  console.log('Smart Reach phase-1 backend tests passed');
  process.exit(0);
}

run().catch((err) => {
  console.error('Smart Reach test error', err);
  process.exit(99);
});
