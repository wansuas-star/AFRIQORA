const fetch = require('node-fetch');

const BASE = process.env.BASE || 'http://localhost:4010';

function extractCookie(setCookie) {
  if (!setCookie) return '';
  return String(setCookie).split(';')[0] || '';
}

function fail(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

async function request(method, path, body, cookie, extraHeaders = {}) {
  const headers = Object.assign({}, extraHeaders);
  if (body) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function register(label) {
  const email = `${label}+${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const password = 'TestPass123!';
  const r = await request('POST', '/auth/register', { email, password, displayName: label });
  if (!r.res.ok || !r.json.ok || !r.json.user) fail('register failed for ' + label, 11);
  const cookie = extractCookie(r.res.headers.get('set-cookie'));
  if (!cookie) fail('missing cookie for ' + label, 12);
  return { cookie, user: r.json.user };
}

async function run() {
  console.log('Search integration test against', BASE);

  const creator = await register('search-creator');
  const viewer = await register('search-viewer');
  const hidden = await register('search-hidden');

  const hiddenSettings = await request('PUT', '/settings/preferences', {
    settings: {
      privacy: { profileVisibility: 'private', twoFactor: false, sessionTimeout: '30m', locationSharing: false }
    }
  }, hidden.cookie);
  if (!hiddenSettings.res.ok || !hiddenSettings.json.ok) fail('failed to set hidden profile settings', 13);

  const business = await request('POST', '/creator/business-profile', {
    businessName: 'Edenvale Electric Masters',
    ownerDisplayName: 'Search Creator',
    category: 'Electrician',
    location: 'Edenvale',
    website: 'https://edenvale-electric.afriqora.local',
    contact: '+2711000222',
    description: 'Certified electrician services for residential and commercial projects in Edenvale.'
  }, creator.cookie);
  if (!business.res.ok || !business.json.ok) fail('business profile create failed', 14);

  const textPost = await request('POST', '/creator/posts', {
    title: 'Edenvale Electrician Service Guide',
    content: 'Professional electrician workflows and safe installation guidance for businesses.',
    category: 'Electrician',
    location: 'Edenvale',
    topics: ['electrician', 'installation', 'safety'],
    status: 'published'
  }, creator.cookie);
  if (!textPost.res.ok || !textPost.json.ok || !textPost.json.post) fail('text post failed', 15);

  const videoPost = await request('POST', '/creator/posts', {
    title: 'Electrician Demo Video',
    content: 'Video walkthrough for electrician inspections in Edenvale.',
    category: 'Electrician',
    location: 'Edenvale',
    topics: ['electrician', 'inspection'],
    video: 'data:video/mp4;base64,AAAA',
    status: 'published'
  }, creator.cookie);
  if (!videoPost.res.ok || !videoPost.json.ok || !videoPost.json.post) fail('video post failed', 16);

  const catPost = await request('POST', '/creator/posts', {
    title: 'Marketing Basics for Service Businesses',
    content: 'Category search validation content.',
    category: 'Marketing',
    location: 'Johannesburg',
    status: 'published'
  }, creator.cookie);
  if (!catPost.res.ok || !catPost.json.ok || !catPost.json.post) fail('category post failed', 17);

  const follow = await request('POST', '/follow', { creatorId: creator.user.afriqoraId, followerId: viewer.user.id }, viewer.cookie);
  if (!follow.res.ok || !follow.json.ok) fail('follow failed', 18);

  console.log('Search people');
  const people = await request('GET', '/search?q=' + encodeURIComponent('search-creator') + '&types=people&limit=10', null, viewer.cookie);
  if (!people.res.ok || !people.json.ok) fail('people search failed', 19);
  if (!people.json.items.some((x) => x.type === 'people' && String(x.title || '').toLowerCase().includes('search-creator'))) fail('people result missing', 20);

  console.log('Search businesses/services/location');
  const businessSearch = await request('GET', '/search?q=' + encodeURIComponent('electrician Edenvale') + '&types=businesses,services,posts,content&limit=20', null, viewer.cookie);
  if (!businessSearch.res.ok || !businessSearch.json.ok) fail('business/service search failed', 21);
  const hasBusiness = businessSearch.json.items.some((x) => x.type === 'businesses' && String(x.title).toLowerCase().includes('edenvale electric'));
  const hasService = businessSearch.json.items.some((x) => x.type === 'services' && String(x.title).toLowerCase().includes('electrician'));
  const hasPost = businessSearch.json.items.some((x) => x.type === 'posts');
  if (!hasBusiness || !hasService || !hasPost) fail('expected business/service/post results missing for electrician Edenvale', 22);

  console.log('Search videos/content');
  const videoSearch = await request('GET', '/search?q=' + encodeURIComponent('demo video electrician') + '&types=videos,content&limit=12', null, viewer.cookie);
  if (!videoSearch.res.ok || !videoSearch.json.ok) fail('video/content search failed', 23);
  if (!videoSearch.json.items.some((x) => x.type === 'videos')) fail('video result missing', 24);

  console.log('Search categories');
  const categorySearch = await request('GET', '/search?q=' + encodeURIComponent('marketing') + '&types=categories&limit=10', null, viewer.cookie);
  if (!categorySearch.res.ok || !categorySearch.json.ok) fail('category search failed', 25);
  if (!categorySearch.json.items.some((x) => x.type === 'categories' && String(x.title).toLowerCase().includes('marketing'))) fail('category result missing', 26);

  console.log('Empty results and invalid input');
  const empty = await request('GET', '/search?q=' + encodeURIComponent('zzzz-no-hit-term-12345') + '&types=people,businesses,posts&limit=10', null, viewer.cookie);
  if (!empty.res.ok || !empty.json.ok) fail('empty result query failed', 27);
  if (Number(empty.json.total || 0) !== 0) fail('empty result query expected zero total', 28);

  const invalid = await request('GET', '/search?q=%20%20%20', null, viewer.cookie);
  if (invalid.res.status !== 400 || invalid.json.ok !== false) fail('invalid input should return 400', 29);

  console.log('Pagination and opening payload');
  for (let i = 0; i < 4; i += 1) {
    const extra = await request('POST', '/creator/posts', {
      title: 'Electrician Extra Result ' + (i + 1),
      content: 'Extra search entry ' + (i + 1),
      category: 'Electrician',
      location: 'Edenvale',
      status: 'published'
    }, creator.cookie);
    if (!extra.res.ok || !extra.json.ok) fail('failed to create pagination post ' + i, 30);
  }

  const p1 = await request('GET', '/search?q=' + encodeURIComponent('electrician') + '&types=posts&limit=2', null, viewer.cookie);
  if (!p1.res.ok || !p1.json.ok) fail('pagination p1 failed', 31);
  if (!p1.json.hasMore || typeof p1.json.nextCursor !== 'number') fail('pagination p1 missing next cursor', 32);
  if (!p1.json.items.length || !p1.json.items[0].routeHint) fail('search opening payload missing routeHint', 33);

  const p2 = await request('GET', '/search?q=' + encodeURIComponent('electrician') + '&types=posts&limit=2&cursor=' + encodeURIComponent(String(p1.json.nextCursor)), null, viewer.cookie);
  if (!p2.res.ok || !p2.json.ok) fail('pagination p2 failed', 34);

  console.log('Authenticated/unauthenticated privacy and blocked behavior');
  const unauthPeople = await request('GET', '/search?q=' + encodeURIComponent('search-hidden') + '&types=people&limit=10');
  if (!unauthPeople.res.ok || !unauthPeople.json.ok) fail('unauth people search failed', 35);
  if (unauthPeople.json.items.some((x) => String(x.title || '').toLowerCase().includes('search-hidden'))) fail('private profile leaked to unauth search', 36);

  const block = await request('POST', '/users/block', { targetUserId: creator.user.id }, viewer.cookie);
  if (!block.res.ok || !block.json.ok) fail('block failed', 37);
  const afterBlock = await request('GET', '/search?q=' + encodeURIComponent('electrician edenvale') + '&types=businesses,posts,videos,content&limit=20', null, viewer.cookie);
  if (!afterBlock.res.ok || !afterBlock.json.ok) fail('search after block failed', 38);
  const leakedBlocked = afterBlock.json.items.some((x) => String(x.ownerAfriqoraId || '') === String(creator.user.afriqoraId || ''));
  if (leakedBlocked) fail('blocked user search results still visible', 39);

  console.log('Search suggestions');
  const suggestions = await request('GET', '/search/suggestions?q=' + encodeURIComponent('electr') + '&limit=8', null, viewer.cookie);
  if (!suggestions.res.ok || !suggestions.json.ok || !Array.isArray(suggestions.json.suggestions)) fail('suggestions query failed', 40);

  console.log('Search integration test passed');
  process.exit(0);
}

run().catch((err) => {
  console.error('Search test error', err);
  process.exit(99);
});
