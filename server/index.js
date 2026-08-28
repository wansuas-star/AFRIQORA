require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Test the connection asynchronously so it doesn't block startup
prisma.$connect()
  .then(() => console.log('Prisma connected successfully to smartreach.db'))
  .catch((e) => console.error('Prisma connection failed:', e));

const DATA_FILE = path.join(__dirname, 'data.json');
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-me-in-production';
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

function signTokenPayload(videoId, viewerId, ttlMs = 5 * 60 * 1000) {
  const now = Date.now();
  const exp = now + ttlMs;
  const nonce = crypto.randomBytes(8).toString('hex');
  const payload = `${videoId}:${viewerId}:${exp}:${nonce}`;
  const sig = crypto.createHmac('sha256', String(ADMIN_KEY)).update(payload).digest('hex');
  return { videoId, viewerId, exp, nonce, sig };
}

function verifyToken(obj) {
  if (!obj || !obj.videoId || !obj.viewerId || !obj.exp || !obj.nonce || !obj.sig) return false;
  const payload = `${obj.videoId}:${obj.viewerId}:${obj.exp}:${obj.nonce}`;
  const expected = crypto.createHmac('sha256', String(ADMIN_KEY)).update(payload).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(String(obj.sig), 'hex'))) return false;
  if (Date.now() > Number(obj.exp)) return false;
  return true;
}
const PORT = Number(process.env.PORT) || 4000;
const PAYOUT_VIEWS_THRESHOLD = Number(process.env.PAYOUT_THRESHOLD) || 100;

function readState() {
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) { return null; }
}

function saveState(state) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf8');
    return true;
  } catch (e) { console.error('Failed to write state', e); return false; }
}

function ensureState() {
  let s = readState();
  if (!s) {
    s = {
      settings: { creatorPct: 70, platformPct: 30, viewValue: 0.01, payoutThreshold: PAYOUT_VIEWS_THRESHOLD },
      videos: {},
      connects: {},
      users: {}, // { userId: { email, displayName, passwordHash, createdAt } }
      sessions: {}, // { sessionId: { userId, createdAt, expiresAt } }
      platform: { totalEarnings: 0 },
      // interactions and social graph
      likes: {}, // { videoId: { userId: timestamp, ... }, ... }
      comments: [], // [{ id, videoId, authorId, text, createdAt }]
      follows: { followersByCreator: {}, followingByUser: {} }, // maps
      shares: {}, // { videoId: [ { userId, platform, createdAt }, ... ] }
    };
    saveState(s);
  }
  // ensure settings and interaction structures exist
  if (!s.settings) s.settings = { creatorPct: 70, platformPct: 30, viewValue: 0.01, payoutThreshold: PAYOUT_VIEWS_THRESHOLD };
  if (typeof s.settings.payoutThreshold === 'undefined') s.settings.payoutThreshold = PAYOUT_VIEWS_THRESHOLD;
  s.likes = s.likes || {};
  s.comments = s.comments || [];
  s.follows = s.follows || { followersByCreator: {}, followingByUser: {} };
  s.shares = s.shares || {};
  s.connects = s.connects || {}; // { userId: { serviceKey: { connected:true, createdAt, meta } } }
  s.videos = s.videos || {};
  s.creators = s.creators || {};
  s.creatorPosts = s.creatorPosts || [];
  s.businessProfiles = s.businessProfiles || {};
  s.platform = s.platform || { totalEarnings: 0 };
  // backfill AFRIQORA IDs for existing users created before afriqoraId was added
  if (s.users && typeof s.users === 'object') {
    Object.keys(s.users).forEach((uid) => {
      if (!s.users[uid].afriqoraId) s.users[uid].afriqoraId = generateAfriqoraId();
    });
  }
  return s;
}

// permissions map for Connect module (UI-only lists; real integrations use official OAuth scopes)
const CONNECT_PERMISSIONS = {
  google: ['View basic profile info', 'List Google accounts', 'Request offline access (refresh tokens)'],
  microsoft: ['View basic profile info', 'Sign in with Microsoft accounts', 'Request offline access (refresh tokens)'],
  'google-drive': ['View and manage Google Drive files (optional)', 'Read metadata and file list'],
  calendar: ['View and manage calendars', 'Create and edit events'],
  email: ['Read basic mailbox metadata', 'Send email on your behalf (optional)'],
  'cloud-storage': ['Upload and download files', 'List buckets and objects'],
  'business-services': ['Access basic business profile', 'Manage appointments and availability']
};

function adminGuard(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.adminKey;
  if (!key || String(key) !== String(ADMIN_KEY)) return res.status(401).json({ error: 'unauthorized' });
  next();
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function parseCookies(req) {
  const header = req.headers && req.headers.cookie;
  const out = {};
  if (!header) return out;
  header.split(';').forEach(pair => { const idx = pair.indexOf('='); if (idx === -1) return; const k = pair.slice(0, idx).trim(); const v = pair.slice(idx + 1).trim(); out[k] = decodeURIComponent(v); });
  return out;
}

function createSession(state, userId) {
  const sid = crypto.randomBytes(16).toString('hex');
  const now = Date.now();
  state.sessions = state.sessions || {};
  state.sessions[sid] = { userId: String(userId), createdAt: now, expiresAt: now + SESSION_TTL_MS };
  saveState(state);
  return sid;
}

function getSession(state, sid) {
  if (!sid || !state.sessions) return null;
  const s = state.sessions[sid]; if (!s) return null; if (Date.now() > Number(s.expiresAt)) { delete state.sessions[sid]; saveState(state); return null; } return s;
}

// Generate a unique AFRIQORA ID
function generateAfriqoraId() {
  return 'AQ-' + crypto.randomBytes(5).toString('hex').toUpperCase();
}
// middleware: attach req.userId when valid session cookie present
function attachSession(req, res, next) {
  try {
    const cookies = parseCookies(req);
    const sid = cookies['afr_session'];
    const state = ensureState();
    const sess = getSession(state, sid);
    if (sess) req.userId = sess.userId;
  } catch (e) { }
  next();
}
const app = express();
app.use(attachSession);

app.use(cors({ origin: true, credentials: true }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '2mb' }));

function requireAuth(req, res, next) {
  if (!req.userId) return res.status(401).json({ error: 'authentication required' });
  const state = ensureState();
  const user = state.users && state.users[req.userId];
  if (!user) return res.status(401).json({ error: 'invalid session' });
  req.authUser = user;
  next();
}

function safeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    afriqoraId: user.afriqoraId,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt
  };
}

function sanitizeText(input, maxLen = 2000) {
  const str = (input || '').toString().replace(/\u0000/g, '').trim();
  if (!str) return '';
  return str.slice(0, maxLen);
}

function normalizeOptionalDataUrl(value, maxLen = 800000) {
  const str = sanitizeText(value, maxLen);
  if (!str) return null;
  // Allow image/video data URLs and regular http(s) URLs used by the current prototype.
  if (/^data:(image|video)\//i.test(str) || /^https?:\/\//i.test(str)) return str;
  return null;
}

function buildPostStats(state, post) {
  const postId = String(post.id);
  const views = Number(((state.videos || {})[postId] || {}).views || 0);
  const likes = Object.keys(((state.likes || {})[postId] || {})).length;
  const comments = (state.comments || []).filter(c => String(c.videoId) === postId).length;
  const shares = ((state.shares || {})[postId] || []).length;
  return { views, likes, comments, shares };
}

function toPublicPost(state, post) {
  const stats = buildPostStats(state, post);
  return {
    id: post.id,
    ownerUserId: post.ownerUserId || post.authorId || null,
    title: post.title,
    content: post.content || post.text || '',
    category: post.category || '',
    location: post.location || '',
    website: post.website || '',
    contact: post.contact || '',
    image: post.image || null,
    video: post.video || null,
    status: post.status || 'published',
    createdAt: typeof post.createdAt === 'string' ? post.createdAt : (post.createdAt ? new Date(post.createdAt).toISOString() : new Date().toISOString()),
    updatedAt: post.updatedAt || null,
    ownerAfriqoraId: post.ownerAfriqoraId,
    ownerDisplayName: post.ownerDisplayName || '',
    engagement: stats
  };
}

// health
app.get('/health', (req, res) => res.json({ ok: true, now: Date.now() }));

// get state (admin)
app.get('/monetization', adminGuard, (req, res) => {
  const s = ensureState(); res.json(s);
});

// issue short-lived signed token to authorize a view report
app.get('/monetization/token', (req, res) => {
  const { videoId, viewerId } = req.query || {};
  if (!videoId || !viewerId) return res.status(400).json({ error: 'videoId and viewerId required' });
  const token = signTokenPayload(String(videoId), String(viewerId));
  res.json({ ok: true, token });
});

// update settings (admin)
app.post('/monetization/settings', adminGuard, (req, res) => {
  const body = req.body || {};
  const { creatorPct, platformPct, viewValue, payoutThreshold } = body;
  if (typeof creatorPct !== 'number' || typeof platformPct !== 'number' || (creatorPct + platformPct) !== 100) {
    return res.status(400).json({ error: 'creatorPct and platformPct must be numbers and sum to 100' });
  }
  if (typeof payoutThreshold !== 'undefined' && (typeof payoutThreshold !== 'number' || Number.isNaN(payoutThreshold) || payoutThreshold < 1)) {
    return res.status(400).json({ error: 'payoutThreshold must be a positive number' });
  }
  const state = ensureState();
  state.settings.creatorPct = creatorPct;
  state.settings.platformPct = platformPct;
  if (typeof viewValue === 'number') state.settings.viewValue = viewValue;
  if (typeof payoutThreshold !== 'undefined') state.settings.payoutThreshold = payoutThreshold;
  saveState(state);
  res.json({ ok: true, settings: state.settings });
});

// smart reach config (admin)
app.put('/smart-reach/config', adminGuard, (req, res) => {
  const body = req.body || {};
  const state = ensureState();
  state.smartReachConfig = Object.assign({}, state.smartReachConfig || {}, body);
  saveState(state);
  res.json({ ok: true, config: state.smartReachConfig });
});

// smart reach content metadata lookup
app.get('/smart-reach/content/:id', async (req, res) => {
  const { id } = req.params;
  const state = ensureState();

  let post = (state.creatorPosts || []).find(p => String(p.id) === String(id));
  if (!post) {
    try {
      const dbPost = await prisma.post.findUnique({ where: { id: String(id) } });
      if (dbPost) {
        post = {
          id: dbPost.id,
          title: dbPost.title,
          content: dbPost.text,
          category: dbPost.category,
          image: dbPost.image,
          video: dbPost.video,
          createdAt: dbPost.createdAt ? dbPost.createdAt.toISOString() : new Date().toISOString()
        };
      }
    } catch (e) {}
  }

  if (!post) {
    return res.status(404).json({ error: 'content not found' });
  }

  let contentType = 'text';
  if (post.video || post.type === 'video' || post.contentType === 'video') {
    contentType = 'video';
  } else if (post.image || post.type === 'image' || post.contentType === 'image') {
    contentType = 'image';
  }

  const publishedAt = post.publishedAt || (post.createdAt ? new Date(post.createdAt).toISOString() : new Date().toISOString());

  const srData = (state.smartReachData && state.smartReachData[String(id)]) || {
    stage: 'initial',
    impressions: 0,
    score: 0
  };

  res.json({
    ok: true,
    content: {
      id: post.id,
      contentType,
      publishedAt,
      title: post.title,
      category: post.category || ''
    },
    smartReach: srData
  });
});

// home feed endpoint with Smart Reach recommendations, pagination & filtering
app.get('/feed/home', async (req, res) => {
  const state = ensureState();
  const userId = req.userId ? String(req.userId) : null;
  const limit = Math.max(1, parseInt(req.query.limit || '20', 10));
  const cursor = parseInt(req.query.cursor || '0', 10);

  let posts = (state.creatorPosts || []).slice();

  try {
    const dbPosts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    if (dbPosts && dbPosts.length > 0) {
      for (const p of dbPosts) {
        if (!posts.some(existing => String(existing.id) === String(p.id))) {
          posts.push({
            id: p.id,
            ownerUserId: p.authorId,
            title: p.title,
            content: p.text,
            category: p.category,
            location: p.location,
            website: p.website,
            contact: p.contact,
            image: p.image,
            video: p.video,
            status: p.status,
            createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString()
          });
        }
      }
    }
  } catch (e) {}

  const notInterestedMap = (userId && state.notInterested && state.notInterested[userId]) || {};
  const blockedUsersMap = (userId && state.blockedUsers && state.blockedUsers[userId]) || {};

  posts = posts.filter(p => {
    const postId = String(p.id);
    const authorId = String(p.ownerUserId || p.authorId || '');

    if (notInterestedMap[postId]) return false;
    if (authorId && blockedUsersMap[authorId]) return false;
    return true;
  });

  const items = posts.map(p => {
    const pub = toPublicPost(state, p);
    const srData = (state.smartReachData && state.smartReachData[String(p.id)]) || {};
    pub.recommendationScore = typeof srData.score === 'number' ? srData.score : 0.5;
    return pub;
  });

  const startIndex = isNaN(cursor) ? 0 : cursor;
  const pageItems = items.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < items.length;
  const nextCursor = hasMore ? startIndex + limit : null;

  res.json({
    ok: true,
    items: pageItems,
    hasMore,
    nextCursor
  });
});

// smart reach engagement event tracking
app.post('/smart-reach/engagement', (req, res) => {
  const body = req.body || {};
  const { contentId, eventType, watchTimeMs } = body;
  if (!contentId || !eventType) return res.status(400).json({ error: 'contentId and eventType required' });

  const state = ensureState();
  state.smartReachData = state.smartReachData || {};

  const id = String(contentId);
  const data = state.smartReachData[id] || {
    stage: 'initial',
    impressions: 0,
    views: 0,
    watchTimeMs: 0,
    completions: 0,
    profileVisits: 0,
    saves: 0,
    score: 0.5
  };

  if (eventType === 'impression') data.impressions += 1;
  else if (eventType === 'view') data.views += 1;
  else if (eventType === 'watch_time') data.watchTimeMs += (Number(watchTimeMs) || 0);
  else if (eventType === 'completion') data.completions += 1;
  else if (eventType === 'profile_visit') data.profileVisits += 1;
  else if (eventType === 'save') data.saves += 1;

  // Calculate recommendation score
  data.score = 0.05 * data.impressions + 0.1 * data.views + 0.2 * data.completions + 0.15 * data.saves + 0.1 * data.profileVisits + (data.watchTimeMs > 10000 ? 0.2 : 0);

  // Evaluate stage expansion
  const cfg = state.smartReachConfig || {};
  const thresholds = cfg.stageThresholds || {};
  const minImpExp = thresholds.initialToExpandedMinImpressions || 2;
  const minScoreExp = thresholds.initialToExpandedMinScore || 0.1;
  const minImpDisc = thresholds.expandedToDiscoveryMinImpressions || 5;
  const minScoreDisc = thresholds.expandedToDiscoveryMinScore || 0.12;

  if (data.impressions >= minImpDisc && data.score >= minScoreDisc) {
    data.stage = 'discovery';
  } else if (data.impressions >= minImpExp && data.score >= minScoreExp) {
    data.stage = 'expanded';
  } else {
    data.stage = 'initial';
  }

  state.smartReachData[id] = data;
  saveState(state);

  res.json({ ok: true, smartReach: data });
});

// content reach analytics
app.get('/analytics/content/:id', (req, res) => {
  const { id } = req.params;
  const state = ensureState();
  const srData = (state.smartReachData && state.smartReachData[String(id)]) || {};

  res.json({
    ok: true,
    contentId: id,
    reach: {
      impressions: srData.impressions || 0,
      views: srData.views || 0,
      saves: srData.saves || 0,
      completions: srData.completions || 0,
      watchTimeMs: srData.watchTimeMs || 0
    }
  });
});

// mark content as not-interested for user
app.post('/content/not-interested', requireAuth, (req, res) => {
  const { contentId, reason } = req.body || {};
  if (!contentId) return res.status(400).json({ error: 'contentId required' });

  const state = ensureState();
  const userId = String(req.userId);
  state.notInterested = state.notInterested || {};
  state.notInterested[userId] = state.notInterested[userId] || {};
  state.notInterested[userId][String(contentId)] = {
    reason: reason || '',
    createdAt: new Date().toISOString()
  };
  saveState(state);

  res.json({ ok: true });
});

// report content
app.post('/content/report', requireAuth, (req, res) => {
  const { contentId, reason } = req.body || {};
  if (!contentId) return res.status(400).json({ error: 'contentId required' });

  const state = ensureState();
  const userId = String(req.userId);
  state.reports = state.reports || [];
  state.reports.push({
    id: 'rep-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    contentId: String(contentId),
    reporterUserId: userId,
    reason: sanitizeText(reason || '', 500),
    createdAt: new Date().toISOString()
  });
  saveState(state);

  res.json({ ok: true });
});

// block user for current viewer
app.post('/users/block', requireAuth, (req, res) => {
  const { targetUserId } = req.body || {};
  if (!targetUserId) return res.status(400).json({ error: 'targetUserId required' });

  const state = ensureState();
  const userId = String(req.userId);
  state.blockedUsers = state.blockedUsers || {};
  state.blockedUsers[userId] = state.blockedUsers[userId] || {};
  state.blockedUsers[userId][String(targetUserId)] = {
    createdAt: new Date().toISOString()
  };
  saveState(state);

  res.json({ ok: true });
});

// user preferences settings
app.put('/settings/preferences', requireAuth, (req, res) => {
  const body = req.body || {};
  const state = ensureState();
  const userId = String(req.userId);
  state.userPreferences = state.userPreferences || {};
  state.userPreferences[userId] = body.settings || {};
  saveState(state);

  res.json({ ok: true, settings: state.userPreferences[userId] });
});

app.get('/settings/preferences', requireAuth, (req, res) => {
  const state = ensureState();
  const userId = String(req.userId);
  const settings = (state.userPreferences && state.userPreferences[userId]) || {};

  res.json({ ok: true, settings });
});

// recommendation admin analytics summary
app.get('/analytics/recommendation', adminGuard, (req, res) => {
  const state = ensureState();
  const srData = state.smartReachData || {};
  let totalImpressions = 0;
  let totalViews = 0;
  const stages = { initial: 0, expanded: 0, discovery: 0 };

  Object.values(srData).forEach(item => {
    totalImpressions += item.impressions || 0;
    totalViews += item.views || 0;
    const st = item.stage || 'initial';
    if (stages[st] !== undefined) stages[st] += 1;
  });

  res.json({
    ok: true,
    summary: {
      totalTrackedContent: Object.keys(srData).length,
      totalImpressions,
      totalViews,
      stages
    }
  });
});

// record a view; dedupe per viewer per 24h
app.post('/monetization/view', (req, res) => {
  const body = req.body || {};
  const { videoId, creatorId, viewerId, token } = body;
  if (!videoId || !creatorId || !viewerId) return res.status(400).json({ error: 'videoId, creatorId, viewerId required' });
  // token must be present and valid
  if (!token || !verifyToken(token)) return res.status(400).json({ error: 'invalid or missing token' });
  // token must match provided video/viewer
  if (String(token.videoId) !== String(videoId) || String(token.viewerId) !== String(viewerId)) return res.status(400).json({ error: 'token mismatch' });

  const state = ensureState();
  state.videos = state.videos || {};
  const now = Date.now(); const windowMs = 24 * 60 * 60 * 1000;
  if (!state.videos[videoId]) state.videos[videoId] = { views: 0, uniqueViewers: {}, usedNonces: {} };
  // reject if nonce already used for this video
  if (state.videos[videoId].usedNonces && state.videos[videoId].usedNonces[token.nonce]) return res.json({ counted: false, reason: 'nonce-used' });
  const last = state.videos[videoId].uniqueViewers[viewerId];
  if (last && (now - last) < windowMs) return res.json({ counted: false, reason: 'recent' });
  state.videos[videoId].views = (state.videos[videoId].views || 0) + 1;
  state.videos[videoId].uniqueViewers[viewerId] = now;
  state.videos[videoId].usedNonces = state.videos[videoId].usedNonces || {};
  state.videos[videoId].usedNonces[token.nonce] = now;
  // payout
  const gross = Number(state.settings.viewValue || 0) || 0;
  const creatorShare = +(gross * (Number(state.settings.creatorPct || 70) / 100)).toFixed(6);
  const platformShare = +(gross * (Number(state.settings.platformPct || 30) / 100)).toFixed(6);
  state.creators = state.creators || {};
  if (!state.creators[creatorId]) state.creators[creatorId] = { totalViews: 0, earnings: 0, availableBalance: 0, withdrawals: [] };
  state.creators[creatorId].totalViews = (state.creators[creatorId].totalViews || 0) + 1;
  state.creators[creatorId].earnings = +(state.creators[creatorId].earnings + creatorShare).toFixed(6);
  state.creators[creatorId].availableBalance = +((state.creators[creatorId].availableBalance || 0) + creatorShare).toFixed(6);
  state.platform.totalEarnings = +((state.platform.totalEarnings || 0) + platformShare).toFixed(6);
  saveState(state);
  res.json({ counted: true, creatorShare, platformShare, settings: state.settings });
});

// get creator stats
app.get('/creator/:id', (req, res, next) => {
  const id = req.params.id;
  if (id === 'dashboard' || id === 'posts' || id === 'business-profile') return next();
  const state = ensureState();
  const c = state.creators[id] || { totalViews: 0, earnings: 0, availableBalance: 0, withdrawals: [] };
  res.json({ creator: c, settings: state.settings, platform: state.platform });
});

// --- Social interactions: likes, comments, follows, shares ---

// like a video (unique per user)
app.post('/interactions/like', async (req, res) => {
  try {
    const { videoId, userId } = req.body || {};
    if (!videoId || !userId) return res.status(400).json({ error: 'videoId and userId required' });
    const state = ensureState();
    state.likes = state.likes || {};
    state.likes[videoId] = state.likes[videoId] || {};
    if (state.likes[videoId][userId]) return res.json({ ok: true, liked: false, reason: 'already' });
    state.likes[videoId][userId] = Date.now();
    // ensure video record
    state.videos = state.videos || {};
    state.videos[videoId] = state.videos[videoId] || { views: 0, uniqueViewers: {}, usedNonces: {} };
    saveState(state);

    try {
      await prisma.postLike.create({
        data: { userId: String(userId), postId: String(videoId) }
      });
    } catch (e) {
      console.error('Prisma write failed for postLike create:', e);
    }

    return res.json({ ok: true, liked: true, likesCount: Object.keys(state.likes[videoId]).length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// unlike a video
app.post('/interactions/unlike', async (req, res) => {
  try {
    const { videoId, userId } = req.body || {};
    if (!videoId || !userId) return res.status(400).json({ error: 'videoId and userId required' });
    const state = ensureState();
    let removed = false;
    if (state.likes && state.likes[videoId] && state.likes[videoId][userId]) {
      delete state.likes[videoId][userId];
      saveState(state);
      removed = true;
    }

    try {
      await prisma.postLike.deleteMany({
        where: { userId: String(userId), postId: String(videoId) }
      });
    } catch (e) {
      console.error('Prisma write failed for postLike delete:', e);
    }

    if (removed) {
      return res.json({ ok: true, liked: false, likesCount: Object.keys(state.likes[videoId] || {}).length });
    }
    return res.json({ ok: true, liked: false, reason: 'not-found' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// add a comment
app.post('/comments', async (req, res) => {
  try {
    const { videoId, authorId, text } = req.body || {};
    if (!videoId || !authorId || !text) return res.status(400).json({ error: 'videoId, authorId and text required' });
    const state = ensureState();
    const commentId = 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const comment = { id: commentId, videoId: String(videoId), authorId: String(authorId), text: String(text), createdAt: new Date().toISOString() };
    state.comments = state.comments || [];
    state.comments.push(comment);
    saveState(state);

    try {
      await prisma.comment.create({
        data: { id: commentId, postId: String(videoId), userId: String(authorId), text: String(text) }
      });
    } catch (e) {
      console.error('Prisma write failed for comment create:', e);
    }

    return res.json({ ok: true, comment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// get comments for a video
app.get('/comments', (req, res) => {
  const { videoId } = req.query || {};
  const state = ensureState();
  if (!videoId) return res.json({ comments: state.comments || [] });
  const comments = (state.comments || []).filter(c => String(c.videoId) === String(videoId));
  res.json({ comments });
});

// follow a creator
app.post('/follow', async (req, res) => {
  try {
    const { creatorId, followerId } = req.body || {};
    if (!creatorId || !followerId) return res.status(400).json({ error: 'creatorId and followerId required' });
    const state = ensureState();
    state.follows = state.follows || { followersByCreator: {}, followingByUser: {} };
    state.follows.followersByCreator[creatorId] = state.follows.followersByCreator[creatorId] || {};
    state.follows.followingByUser[followerId] = state.follows.followingByUser[followerId] || {};
    if (state.follows.followersByCreator[creatorId][followerId]) return res.json({ ok: true, followed: false, reason: 'already' });
    state.follows.followersByCreator[creatorId][followerId] = Date.now();
    state.follows.followingByUser[followerId][creatorId] = Date.now();
    saveState(state);

    try {
      await prisma.userFollow.create({
        data: { followerId: String(followerId), followingId: String(creatorId) }
      });
    } catch (e) {
      console.error('Prisma write failed for follow create:', e);
    }

    return res.json({ ok: true, followed: true, followersCount: Object.keys(state.follows.followersByCreator[creatorId]).length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// unfollow
app.post('/unfollow', async (req, res) => {
  try {
    const { creatorId, followerId } = req.body || {};
    if (!creatorId || !followerId) return res.status(400).json({ error: 'creatorId and followerId required' });
    const state = ensureState();
    if (state.follows && state.follows.followersByCreator && state.follows.followersByCreator[creatorId] && state.follows.followersByCreator[creatorId][followerId]) {
      delete state.follows.followersByCreator[creatorId][followerId];
    }
    if (state.follows && state.follows.followingByUser && state.follows.followingByUser[followerId] && state.follows.followingByUser[followerId][creatorId]) {
      delete state.follows.followingByUser[followerId][creatorId];
    }
    saveState(state);

    try {
      await prisma.userFollow.deleteMany({
        where: { followerId: String(followerId), followingId: String(creatorId) }
      });
    } catch (e) {
      console.error('Prisma write failed for follow delete:', e);
    }

    return res.json({ ok: true, followed: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// share a video (record only)
app.post('/interactions/share', async (req, res) => {
  try {
    const { videoId, userId, platform } = req.body || {};
    if (!videoId || !userId) return res.status(400).json({ error: 'videoId and userId required' });
    const state = ensureState();
    state.shares = state.shares || {};
    state.shares[videoId] = state.shares[videoId] || [];
    state.shares[videoId].push({ userId: String(userId), platform: platform || null, createdAt: new Date().toISOString() });
    saveState(state);

    try {
      await prisma.postShare.create({
        data: { postId: String(videoId), userId: String(userId), platform: platform || null }
      });
    } catch (e) {
      console.error('Prisma write failed for share create:', e);
    }

    return res.json({ ok: true, sharesCount: state.shares[videoId].length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// query likes for a video and whether a user liked it
app.get('/interactions/likes', (req, res) => {
  const { videoId, userId } = req.query || {};
  const state = ensureState();
  const likesFor = (state.likes && state.likes[videoId]) ? state.likes[videoId] : {};
  const likesCount = Object.keys(likesFor).length;
  const liked = userId ? Boolean(likesFor[String(userId)]) : false;
  res.json({ videoId, likesCount, liked });
});

// save a video/content
app.post('/interactions/save', requireAuth, (req, res) => {
  const { videoId, contentId } = req.body || {};
  const id = String(videoId || contentId || '');
  if (!id) return res.status(400).json({ error: 'videoId is required' });

  const state = ensureState();
  const userId = String(req.userId);
  state.saves = state.saves || {};
  state.saves[userId] = state.saves[userId] || {};

  state.saves[userId][id] = true;

  // Also increment saves in smartReachData
  state.smartReachData = state.smartReachData || {};
  if (!state.smartReachData[id]) {
    state.smartReachData[id] = { stage: 'initial', impressions: 0, views: 0, watchTimeMs: 0, completions: 0, profileVisits: 0, saves: 0, score: 0.5 };
  }
  state.smartReachData[id].saves = (state.smartReachData[id].saves || 0) + 1;

  saveState(state);

  res.json({ ok: true, saved: true });
});

// query saves status for a video
app.get('/interactions/saves', requireAuth, (req, res) => {
  const videoId = String(req.query.videoId || req.query.contentId || '');
  const state = ensureState();
  const userId = String(req.userId);
  const saved = !!(state.saves && state.saves[userId] && state.saves[userId][videoId]);

  res.json({ ok: true, saved });
});

// query follow status and follower count
app.get('/follow/status', (req, res) => {
  const { creatorId, userId } = req.query || {};
  const state = ensureState();
  const followers = (state.follows && state.follows.followersByCreator && state.follows.followersByCreator[creatorId]) ? state.follows.followersByCreator[creatorId] : {};
  const followersCount = Object.keys(followers).length;
  const following = userId ? Boolean(state.follows && state.follows.followingByUser && state.follows.followingByUser[userId] && state.follows.followingByUser[userId][creatorId]) : false;
  res.json({ creatorId, followersCount, following });
});

// video stats for feed/recommendations
app.get('/stats/video/:id', (req, res) => {
  const id = req.params.id;
  const state = ensureState();
  const video = state.videos && state.videos[id] ? state.videos[id] : { views: 0 };
  const likesCount = state.likes && state.likes[id] ? Object.keys(state.likes[id]).length : 0;
  const commentsCount = (state.comments || []).filter(c => String(c.videoId) === String(id)).length;
  const sharesCount = state.shares && state.shares[id] ? state.shares[id].length : 0;
  res.json({ videoId: id, views: Number(video.views || 0), likes: likesCount, comments: commentsCount, shares: sharesCount });
});

// Connect module: list services connected for a user
app.get('/connect/services', (req, res) => {
  const userId = req.query.userId || req.query.uid || 'anonymous';
  const state = ensureState();
  const userConns = state.connects[userId] || {};
  res.json({ userId, services: userConns });
});

// --- Authentication: register, login, logout, me ---
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const state = ensureState();
    // ensure unique email
    const existing = Object.values(state.users).find(u => String(u.email).toLowerCase() === String(email).toLowerCase());
    if (existing) return res.status(400).json({ error: 'email in use' });
    const userId = 'u-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const hash = bcrypt.hashSync(String(password), 10);
    const afriqoraId = generateAfriqoraId();

    // Write to legacy state
    state.users[userId] = {
      afriqoraId: afriqoraId,
      id: userId,
      email: String(email),
      passwordHash: hash,
      displayName: String(displayName),
      createdAt: new Date()
    };
    saveState(state);

    // Dual-write to Prisma
    try {
      await prisma.user.create({
        data: {
          id: userId,
          afriqoraId: afriqoraId,
          email: String(email),
          passwordHash: hash,
          displayName: String(displayName),
        }
      });
    } catch (dbErr) {
      console.error('Prisma write failed for user register:', dbErr);
    }

    // create session
    const sid = createSession(state, userId);
    res.setHeader('Set-Cookie', `afr_session=${encodeURIComponent(sid)}; HttpOnly; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`);
    res.json({ ok: true, user: safeUser(state.users[userId]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const state = ensureState();
  const user = Object.values(state.users || {}).find(u => String(u.email).toLowerCase() === String(email).toLowerCase());
  if (!user) return res.status(400).json({ error: 'invalid credentials' });
  if (!bcrypt.compareSync(String(password), String(user.passwordHash))) return res.status(400).json({ error: 'invalid credentials' });
  if (!user.afriqoraId) user.afriqoraId = generateAfriqoraId();
  const sid = createSession(state, user.id);
  saveState(state);
  res.setHeader('Set-Cookie', `afr_session=${encodeURIComponent(sid)}; HttpOnly; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`);
  res.json({ ok: true, user: safeUser(user) });
});

app.post('/auth/logout', (req, res) => {
  const cookies = parseCookies(req); const sid = cookies['afr_session']; const state = ensureState(); if (sid && state.sessions && state.sessions[sid]) { delete state.sessions[sid]; saveState(state); }
  // expire cookie
  res.setHeader('Set-Cookie', `afr_session=deleted; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
  res.json({ ok: true });
});

app.get('/auth/me', async (req, res) => {
  if (!req.userId) return res.json({ user: null });
  const state = ensureState();
  let u = null;

  try {
    const prismaUser = await prisma.user.findUnique({ where: { id: String(req.userId) } });
    if (prismaUser) {
      u = prismaUser;
    }
  } catch (e) {
    console.error('Prisma read failed for auth/me:', e);
  }

  // Fallback to legacy
  if (!u) {
    u = state.users && state.users[req.userId];
    if (!u) return res.json({ user: null });
    if (!u.afriqoraId) {
      u.afriqoraId = generateAfriqoraId();
      saveState(state);
    }
  } else if (!u.afriqoraId) {
    // Make sure Prisma user has afriqoraId (which is required in DB anyway)
    u.afriqoraId = generateAfriqoraId();
    await prisma.user.update({ where: { id: u.id }, data: { afriqoraId: u.afriqoraId } }).catch(() => { });
  }

  res.json({ user: safeUser(u) });
});

// --- Authenticated creator identity, profile, and post APIs ---
app.get('/creator/dashboard', requireAuth, async (req, res) => {
  const state = ensureState();
  let user = null;
  try {
    user = await prisma.user.findUnique({ where: { id: String(req.userId) } });
  } catch (e) {
    console.error('Prisma user fetch failed:', e);
  }

  if (!user) {
    user = state.users[req.userId];
    if (!user.afriqoraId) {
      user.afriqoraId = generateAfriqoraId();
      saveState(state);
    }
  }

  state.creators = state.creators || {};
  const creatorStats = state.creators[user.afriqoraId] || { totalViews: 0, earnings: 0, availableBalance: 0, withdrawals: [] };

  let myPosts = [];
  let businessProfile = null;

  try {
    const pPosts = await prisma.post.findMany({
      where: { authorId: String(req.userId) },
      orderBy: { createdAt: 'desc' }
    });
    if (pPosts && pPosts.length > 0) {
      myPosts = pPosts.map(p => ({
        id: p.id,
        ownerUserId: p.authorId,
        title: p.title,
        content: p.text,
        category: p.category,
        location: p.location,
        website: p.website,
        contact: p.contact,
        image: p.image,
        video: p.video,
        status: p.status,
        createdAt: p.createdAt.toISOString()
      }));
    }

    const bProf = await prisma.businessProfile.findFirst({ where: { ownerId: String(req.userId) } });
    if (bProf) {
      businessProfile = {
        id: bProf.id,
        ownerUserId: bProf.ownerId,
        businessName: bProf.businessName,
        category: bProf.category,
        location: bProf.location,
        website: bProf.website,
        contact: bProf.phone,
        description: bProf.description,
        logo: bProf.logo,
        createdAt: bProf.createdAt.toISOString()
      };
    }
  } catch (dbErr) {
    console.error('Prisma dashboard fetch failed:', dbErr);
  }

  // Fallback to legacy
  if (myPosts.length === 0) {
    myPosts = (state.creatorPosts || [])
      .filter(p => String(p.ownerUserId) === String(user.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(p => toPublicPost(state, p));
  }
  if (!businessProfile) {
    businessProfile = state.businessProfiles[user.id] || null;
  }

  res.json({
    ok: true,
    user: safeUser(user),
    creator: creatorStats,
    businessProfile,
    posts: myPosts,
    settings: state.settings
  });
});

app.post('/creator/business-profile', requireAuth, async (req, res) => {
  try {
    const state = ensureState();
    const user = state.users[req.userId];
    const body = req.body || {};
    const profile = {
      id: (state.businessProfiles[user.id] && state.businessProfiles[user.id].id) || ('bp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)),
      ownerUserId: user.id,
      ownerAfriqoraId: user.afriqoraId,
      ownerDisplayName: sanitizeText(body.ownerDisplayName || user.displayName || '', 120),
      businessName: sanitizeText(body.businessName, 160),
      category: sanitizeText(body.category, 100),
      location: sanitizeText(body.location, 120),
      website: sanitizeText(body.website, 200),
      contact: sanitizeText(body.contact, 120),
      description: sanitizeText(body.description, 1200),
      logo: normalizeOptionalDataUrl(body.logo, 800000),
      updatedAt: new Date().toISOString(),
      createdAt: (state.businessProfiles[user.id] && state.businessProfiles[user.id].createdAt) || new Date().toISOString()
    };
    if (!profile.businessName) return res.status(400).json({ error: 'businessName is required' });
    state.businessProfiles[user.id] = profile;
    saveState(state);

    try {
      await prisma.businessProfile.upsert({
        where: { id: profile.id },
        update: {
          businessName: profile.businessName,
          category: profile.category,
          location: profile.location,
          website: profile.website,
          phone: profile.contact,
          description: profile.description,
          logo: profile.logo
        },
        create: {
          id: profile.id,
          ownerId: user.id,
          businessName: profile.businessName,
          category: profile.category,
          location: profile.location,
          website: profile.website,
          phone: profile.contact,
          description: profile.description,
          logo: profile.logo,
          createdAt: new Date(profile.createdAt)
        }
      });
    } catch (dbErr) {
      console.error('Prisma write failed for business profile:', dbErr);
    }

    res.json({ ok: true, businessProfile: profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/creator/posts', requireAuth, async (req, res) => {
  try {
    const state = ensureState();
    const user = state.users[req.userId];
    const body = req.body || {};
    const title = sanitizeText(body.title, 180);
    const content = sanitizeText(body.content, 4000);
    if (!title || !content) return res.status(400).json({ error: 'title and content are required' });

    const postId = 'cp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const category = sanitizeText(body.category, 100);
    const location = sanitizeText(body.location, 120);
    const website = sanitizeText(body.website, 200);
    const contact = sanitizeText(body.contact, 120);
    const image = normalizeOptionalDataUrl(body.image, 800000);
    const video = normalizeOptionalDataUrl(body.video, 1800000);
    const status = sanitizeText(body.status, 40) || 'published';
    const createdAt = new Date();
    const isBusiness = !!(state.businessProfiles && state.businessProfiles[user.id]);

    const post = {
      id: postId,
      ownerUserId: user.id,
      ownerAfriqoraId: user.afriqoraId,
      ownerDisplayName: sanitizeText(user.displayName || 'Creator', 120),
      title,
      content,
      category,
      location,
      website,
      contact,
      image,
      video,
      status,
      createdAt: createdAt.toISOString(),
      updatedAt: null
    };

    // Dual-write to Prisma
    try {
      await prisma.post.create({
        data: {
          id: postId,
          authorId: user.id,
          businessId: isBusiness ? state.businessProfiles[user.id].id : null,
          title: title,
          text: content,
          category: category,
          location: location,
          website: website,
          contact: contact,
          image: image,
          video: video,
          status: status,
          type: video ? 'video' : 'post',
          createdAt: createdAt
        }
      });
    } catch (dbErr) {
      console.error('Prisma write failed for post create:', dbErr);
    }

    state.creatorPosts = state.creatorPosts || [];
    state.creatorPosts.unshift(post);
    saveState(state);
    res.status(201).json({ ok: true, post: toPublicPost(state, post) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/creator/posts/mine', requireAuth, async (req, res) => {
  const state = ensureState();
  let mine = [];
  try {
    const prismaPosts = await prisma.post.findMany({
      where: { authorId: String(req.userId) },
      orderBy: { createdAt: 'desc' }
    });
    if (prismaPosts && prismaPosts.length > 0) {
      mine = prismaPosts.map(p => {
        // Map Prisma Post to legacy public post format
        return {
          id: p.id,
          ownerUserId: p.authorId,
          title: p.title,
          content: p.text,
          category: p.category,
          location: p.location,
          website: p.website,
          contact: p.contact,
          image: p.image,
          video: p.video,
          status: p.status,
          createdAt: p.createdAt.toISOString()
        };
      });
    }
  } catch (dbErr) {
    console.error('Prisma read failed for creator/posts/mine:', dbErr);
  }

  // Fallback to legacy if Prisma results are empty
  if (mine.length === 0) {
    mine = (state.creatorPosts || [])
      .filter(p => String(p.ownerUserId) === String(req.userId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(p => toPublicPost(state, p));
  }

  res.json({ ok: true, posts: mine });
});

app.put('/creator/posts/:id', requireAuth, (req, res) => {
  const state = ensureState();
  const idx = (state.creatorPosts || []).findIndex(p => String(p.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'post not found' });
  const post = state.creatorPosts[idx];
  if (String(post.ownerUserId) !== String(req.userId)) return res.status(403).json({ error: 'forbidden' });

  const body = req.body || {};
  const nextTitle = sanitizeText(body.title ?? post.title, 180);
  const nextContent = sanitizeText(body.content ?? post.content, 4000);
  if (!nextTitle || !nextContent) return res.status(400).json({ error: 'title and content are required' });

  post.title = nextTitle;
  post.content = nextContent;
  post.category = sanitizeText(body.category ?? post.category, 100);
  post.location = sanitizeText(body.location ?? post.location, 120);
  post.website = sanitizeText(body.website ?? post.website, 200);
  post.contact = sanitizeText(body.contact ?? post.contact, 120);
  if (typeof body.image !== 'undefined') post.image = normalizeOptionalDataUrl(body.image, 800000);
  if (typeof body.video !== 'undefined') post.video = normalizeOptionalDataUrl(body.video, 1800000);
  if (typeof body.status !== 'undefined') post.status = sanitizeText(body.status, 40) || 'published';
  post.updatedAt = new Date().toISOString();

  state.creatorPosts[idx] = post;
  saveState(state);
  res.json({ ok: true, post: toPublicPost(state, post) });
});

app.delete('/creator/posts/:id', requireAuth, async (req, res) => {
  const state = ensureState();
  const idx = (state.creatorPosts || []).findIndex(p => String(p.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'post not found' });
  const post = state.creatorPosts[idx];
  if (String(post.ownerUserId) !== String(req.userId)) return res.status(403).json({ error: 'forbidden' });
  state.creatorPosts.splice(idx, 1);
  saveState(state);

  // Dual-delete from Prisma to keep stores in sync
  try {
    await prisma.post.delete({ where: { id: String(req.params.id) } });
  } catch (dbErr) {
    console.error('Prisma delete failed for creator/posts/:id:', dbErr);
  }

  res.json({ ok: true });
});

app.get('/creator/posts/public', async (req, res) => {
  const state = ensureState();
  const q = sanitizeText(req.query.q || '', 200).toLowerCase();
  const category = sanitizeText(req.query.category || '', 100).toLowerCase();
  const location = sanitizeText(req.query.location || '', 120).toLowerCase();

  let items = [];
  try {
    const whereClause = { status: 'published' };
    if (category) {
      // Basic match for now, could be improved with Prisma text search
      whereClause.category = { contains: category };
    }
    if (location) {
      whereClause.location = { contains: location };
    }

    // For global search, we fetch and filter in memory as a simple fallback if Prisma FTS isn't set up
    const prismaPosts = await prisma.post.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    if (prismaPosts && prismaPosts.length > 0) {
      let filtered = prismaPosts;
      if (q) {
        filtered = prismaPosts.filter(p => {
          const hay = [p.title, p.text, p.category, p.location, p.website, p.contact].map(v => String(v || '').toLowerCase()).join(' ');
          return hay.includes(q);
        });
      }

      items = filtered.map(p => {
        return {
          id: p.id,
          ownerUserId: p.authorId,
          title: p.title,
          content: p.text,
          category: p.category,
          location: p.location,
          website: p.website,
          contact: p.contact,
          image: p.image,
          video: p.video,
          status: p.status,
          createdAt: p.createdAt.toISOString()
        };
      });
    }
  } catch (dbErr) {
    console.error('Prisma read failed for creator/posts/public:', dbErr);
  }

  // Fallback to legacy if Prisma is empty
  if (items.length === 0) {
    items = (state.creatorPosts || [])
      .filter(p => String(p.status || 'published').toLowerCase() === 'published')
      .filter(p => {
        if (category && String(p.category || '').toLowerCase() !== category) return false;
        if (location && !String(p.location || '').toLowerCase().includes(location)) return false;
        if (!q) return true;
        const hay = [p.title, p.content, p.category, p.location, p.website, p.contact, p.ownerDisplayName, p.ownerAfriqoraId]
          .map(v => String(v || '').toLowerCase())
          .join(' ');
        return hay.includes(q);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(p => toPublicPost(state, p));
  }

  res.json({ ok: true, posts: items });
});

// query permissions for a given service (UI-only help)
app.get('/connect/permissions', (req, res) => {
  const service = req.query.service;
  const perms = CONNECT_PERMISSIONS[service] || [];
  res.json({ service, permissions: perms });
});

// connect a service for a user (stub: record intent + perms)
app.post('/connect/connect', (req, res) => {
  const { service, userId } = req.body || {};
  if (!service || !userId) return res.status(400).json({ error: 'service and userId required' });
  const state = ensureState();
  state.connects = state.connects || {};
  state.connects[userId] = state.connects[userId] || {};
  state.connects[userId][service] = { connected: true, createdAt: new Date().toISOString(), meta: { permissions: CONNECT_PERMISSIONS[service] || [] } };
  saveState(state);
  res.json({ ok: true, service, connected: true, permissions: state.connects[userId][service].meta.permissions });
});

// disconnect a service
app.post('/connect/disconnect', (req, res) => {
  const { service, userId } = req.body || {};
  if (!service || !userId) return res.status(400).json({ error: 'service and userId required' });
  const state = ensureState();
  if (state.connects && state.connects[userId] && state.connects[userId][service]) {
    delete state.connects[userId][service];
    saveState(state);
  }
  res.json({ ok: true, service, connected: false });
});

// request withdrawal (simulate)
app.post('/creator/:id/withdraw', (req, res) => {
  const id = req.params.id; const body = req.body || {}; const amount = Number(body.amount || 0);
  const state = ensureState(); state.creators = state.creators || {}; if (!state.creators[id]) state.creators[id] = { totalViews: 0, earnings: 0, availableBalance: 0, withdrawals: [] };
  // enforce payout eligibility threshold (from persisted settings when available)
  const creatorViews = Number(state.creators[id].totalViews || 0);
  const threshold = Number((state.settings && state.settings.payoutThreshold) || PAYOUT_VIEWS_THRESHOLD);
  if (creatorViews < threshold) return res.status(400).json({ error: `Withdrawal eligibility requires ${threshold} valid views. You have ${creatorViews}.` });
  const avail = Number(state.creators[id].availableBalance || 0);
  if (amount <= 0 || amount > avail) return res.status(400).json({ error: 'invalid amount' });
  state.creators[id].availableBalance = +(avail - amount).toFixed(6);
  const w = { id: 'w-' + Date.now(), amount, requestedAt: new Date().toISOString(), status: 'pending' };
  state.creators[id].withdrawals.unshift(w);
  saveState(state);
  res.json({ ok: true, withdrawal: w });
});

// disconnect a service
app.post('/connect/disconnect', async (req, res) => {
  try {
    const { service, userId } = req.body || {};
    if (!service || !userId) return res.status(400).json({ error: 'service and userId required' });
    const state = ensureState();
    if (state.connects && state.connects[userId] && state.connects[userId][service]) {
      delete state.connects[userId][service];
      saveState(state);
    }

    try {
      await prisma.serviceConnection.deleteMany({
        where: { userId: String(userId), serviceName: String(service) }
      });
    } catch (e) {
      console.error('Prisma write failed for disconnect:', e);
    }

    res.json({ ok: true, service, connected: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// request withdrawal (simulate)
app.post('/creator/:id/withdraw', async (req, res) => {
  const id = req.params.id; const body = req.body || {}; const amount = Number(body.amount || 0);
  const state = ensureState(); state.creators = state.creators || {}; if (!state.creators[id]) state.creators[id] = { totalViews: 0, earnings: 0, availableBalance: 0, withdrawals: [] };
  // enforce payout eligibility threshold (from persisted settings when available)
  const creatorViews = Number(state.creators[id].totalViews || 0);
  const threshold = Number((state.settings && state.settings.payoutThreshold) || PAYOUT_VIEWS_THRESHOLD);
  if (creatorViews < threshold) return res.status(400).json({ error: `Withdrawal eligibility requires ${threshold} valid views. You have ${creatorViews}.` });
  const avail = Number(state.creators[id].availableBalance || 0);
  if (amount <= 0 || amount > avail) return res.status(400).json({ error: 'invalid amount' });
  state.creators[id].availableBalance = +(avail - amount).toFixed(6);
  const w = { id: 'w-' + Date.now(), amount, requestedAt: new Date().toISOString(), status: 'pending' };
  state.creators[id].withdrawals.unshift(w);
  saveState(state);

  try {
    await prisma.wallet.update({
      where: { userId: String(id) },
      data: { availableBalance: state.creators[id].availableBalance }
    });
    await prisma.withdrawal.create({
      data: { userId: String(id), amount: w.amount, status: w.status, createdAt: new Date(w.requestedAt) }
    });
  } catch (e) { console.error('Prisma write failed', e); }

  res.json({ ok: true, withdrawal: w });
});

// start
app.listen(PORT, () => { console.log('AFRIQORA monetization server listening on port', PORT); ensureState(); });
