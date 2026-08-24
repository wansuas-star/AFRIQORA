require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const { createSmartReachDbStore } = require('./smartReachDb');

const DATA_FILE = path.join(__dirname, 'data.json');
const SMART_REACH_DB_FILE = process.env.SMART_REACH_DB_FILE || path.join(__dirname, 'smartreach.db');
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-me-in-production';
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

let smartReachDb = null;
let searchStateRevision = 0;
let searchIndexCache = { revision: -1, index: null };

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

function defaultSmartReachConfig() {
  return {
    initialPoolSize: 40,
    expandedPoolSize: 140,
    discoveryPoolSize: 320,
    maxFeedItemsPerAuthor: 3,
    scoring: {
      relevance: 0.45,
      engagement: 0.35,
      freshness: 0.2,
      followBoost: 1.8,
      interestBoost: 1.15,
      locationBoost: 0.7,
      businessBoost: 0.6,
      negativePenalty: 1.2,
      repeatPenalty: 0.6,
      halfLifeHours: 48
    },
    stageThresholds: {
      initialToExpandedMinImpressions: 25,
      initialToExpandedMinScore: 0.62,
      expandedToDiscoveryMinImpressions: 120,
      expandedToDiscoveryMinScore: 0.74
    },
    dedupeWindowsMs: {
      impression: 30000,
      view: 45000,
      watch_time: 10000,
      completion: 30000,
      skip: 10000,
      profile_visit: 30000,
      like: 86400000,
      comment: 15000,
      share: 30000,
      save: 86400000,
      follows_generated: 3600000,
      not_interested: 86400000,
      report: 86400000
    }
  };
}

function defaultUserSettings() {
  return {
    privacy: { twoFactor: false, profileVisibility: 'public', sessionTimeout: '30m', locationSharing: false },
    notifications: { email: true, push: true, creatorActivity: true, securityAlerts: true, digestFrequency: 'daily' },
    ai: { assistantEnabled: true, summaryTone: 'balanced', smartCompose: true, recommendationLevel: 65 },
    voice: { preferredVoice: 'neutral', autoNoiseReduction: true, autoCaption: true, micSensitivity: 55 },
    search: { safeSearch: true, includeMarketplace: true, includeServices: true, resultDensity: 'comfortable', preferredSort: 'relevance' },
    account: { loginAlerts: true, shareUsageInsights: false },
    appearance: { theme: 'system', compactMode: false, reduceMotion: false },
    languageRegion: { language: 'en', country: 'ZA', timezone: 'Africa/Johannesburg', dateFormat: 'dd/mm/yyyy' },
    payments: { defaultCurrency: 'ZAR', autoRenew: true, invoiceEmail: '', planTier: 'starter' },
    safety: { blurSensitiveMedia: true, dmFilterLevel: 'medium', contentReview: true },
    help: { diagnostics: false, contactChannel: 'email' },
    about: { releaseChannel: 'stable', telemetryNoticeSeen: false }
  };
}

function mergeDefaultUserSettings(stored) {
  const defaults = defaultUserSettings();
  const inObj = (stored && typeof stored === 'object') ? stored : {};
  const out = JSON.parse(JSON.stringify(defaults));
  Object.keys(out).forEach((section) => {
    if (!inObj[section] || typeof inObj[section] !== 'object') return;
    Object.keys(out[section]).forEach((k) => {
      if (typeof inObj[section][k] !== 'undefined') out[section][k] = inObj[section][k];
    });
  });
  return out;
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function sanitizeUserSettings(input, current) {
  const base = mergeDefaultUserSettings(current);
  if (!input || typeof input !== 'object') return base;

  const boolVal = (v, fallback) => (typeof v === 'boolean' ? v : fallback);
  const enumVal = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);
  const shortText = (v, maxLen, fallback) => {
    if (typeof v !== 'string') return fallback;
    const s = v.replace(/\u0000/g, '').trim();
    if (!s) return fallback;
    return s.slice(0, maxLen);
  };

  const src = input;
  base.privacy.twoFactor = boolVal(src?.privacy?.twoFactor, base.privacy.twoFactor);
  base.privacy.profileVisibility = enumVal(src?.privacy?.profileVisibility, ['public', 'community', 'private'], base.privacy.profileVisibility);
  base.privacy.sessionTimeout = enumVal(src?.privacy?.sessionTimeout, ['15m', '30m', '2h', 'never'], base.privacy.sessionTimeout);
  base.privacy.locationSharing = boolVal(src?.privacy?.locationSharing, base.privacy.locationSharing);

  base.notifications.email = boolVal(src?.notifications?.email, base.notifications.email);
  base.notifications.push = boolVal(src?.notifications?.push, base.notifications.push);
  base.notifications.creatorActivity = boolVal(src?.notifications?.creatorActivity, base.notifications.creatorActivity);
  base.notifications.securityAlerts = boolVal(src?.notifications?.securityAlerts, base.notifications.securityAlerts);
  base.notifications.digestFrequency = enumVal(src?.notifications?.digestFrequency, ['realtime', 'daily', 'weekly'], base.notifications.digestFrequency);

  base.ai.assistantEnabled = boolVal(src?.ai?.assistantEnabled, base.ai.assistantEnabled);
  base.ai.summaryTone = enumVal(src?.ai?.summaryTone, ['brief', 'balanced', 'detailed'], base.ai.summaryTone);
  base.ai.smartCompose = boolVal(src?.ai?.smartCompose, base.ai.smartCompose);
  base.ai.recommendationLevel = clampNumber(src?.ai?.recommendationLevel, 0, 100, base.ai.recommendationLevel);

  base.voice.preferredVoice = enumVal(src?.voice?.preferredVoice, ['neutral', 'warm', 'energetic'], base.voice.preferredVoice);
  base.voice.autoNoiseReduction = boolVal(src?.voice?.autoNoiseReduction, base.voice.autoNoiseReduction);
  base.voice.autoCaption = boolVal(src?.voice?.autoCaption, base.voice.autoCaption);
  base.voice.micSensitivity = clampNumber(src?.voice?.micSensitivity, 0, 100, base.voice.micSensitivity);

  base.search.safeSearch = boolVal(src?.search?.safeSearch, base.search.safeSearch);
  base.search.includeMarketplace = boolVal(src?.search?.includeMarketplace, base.search.includeMarketplace);
  base.search.includeServices = boolVal(src?.search?.includeServices, base.search.includeServices);
  base.search.resultDensity = enumVal(src?.search?.resultDensity, ['compact', 'comfortable', 'expanded'], base.search.resultDensity);
  base.search.preferredSort = enumVal(src?.search?.preferredSort, ['relevance', 'latest', 'popular'], base.search.preferredSort);

  base.account.loginAlerts = boolVal(src?.account?.loginAlerts, base.account.loginAlerts);
  base.account.shareUsageInsights = boolVal(src?.account?.shareUsageInsights, base.account.shareUsageInsights);

  base.appearance.theme = enumVal(src?.appearance?.theme, ['system', 'dark', 'light'], base.appearance.theme);
  base.appearance.compactMode = boolVal(src?.appearance?.compactMode, base.appearance.compactMode);
  base.appearance.reduceMotion = boolVal(src?.appearance?.reduceMotion, base.appearance.reduceMotion);

  base.languageRegion.language = enumVal(src?.languageRegion?.language, ['en', 'fr', 'sw', 'pt'], base.languageRegion.language);
  base.languageRegion.country = shortText(src?.languageRegion?.country, 2, base.languageRegion.country).toUpperCase();
  base.languageRegion.timezone = enumVal(src?.languageRegion?.timezone, ['Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi', 'Africa/Cairo'], base.languageRegion.timezone);
  base.languageRegion.dateFormat = enumVal(src?.languageRegion?.dateFormat, ['dd/mm/yyyy', 'mm/dd/yyyy', 'yyyy-mm-dd'], base.languageRegion.dateFormat);

  base.payments.defaultCurrency = shortText(src?.payments?.defaultCurrency, 3, base.payments.defaultCurrency).toUpperCase();
  base.payments.autoRenew = boolVal(src?.payments?.autoRenew, base.payments.autoRenew);
  base.payments.invoiceEmail = shortText(src?.payments?.invoiceEmail, 180, base.payments.invoiceEmail);
  base.payments.planTier = enumVal(src?.payments?.planTier, ['starter', 'pro', 'business'], base.payments.planTier);

  base.safety.blurSensitiveMedia = boolVal(src?.safety?.blurSensitiveMedia, base.safety.blurSensitiveMedia);
  base.safety.dmFilterLevel = enumVal(src?.safety?.dmFilterLevel, ['low', 'medium', 'high'], base.safety.dmFilterLevel);
  base.safety.contentReview = boolVal(src?.safety?.contentReview, base.safety.contentReview);

  base.help.diagnostics = boolVal(src?.help?.diagnostics, base.help.diagnostics);
  base.help.contactChannel = enumVal(src?.help?.contactChannel, ['email', 'whatsapp', 'inapp'], base.help.contactChannel);

  base.about.releaseChannel = enumVal(src?.about?.releaseChannel, ['stable', 'preview'], base.about.releaseChannel);
  base.about.telemetryNoticeSeen = boolVal(src?.about?.telemetryNoticeSeen, base.about.telemetryNoticeSeen);

  return base;
}

function readState() {
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) { return null; }
}

function saveState(state) {
  try {
    const stateToPersist = Object.assign({}, state || {});
    const smartReachState = stateToPersist.smartReach;
    if (smartReachState && smartReachDb) {
      smartReachDb.saveState(smartReachState);
      delete stateToPersist.smartReach;
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(stateToPersist, null, 2), 'utf8');
    searchStateRevision += 1;
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
      notificationsById: {},
      notificationsByUser: {},
      notificationUnreadCounts: {},
      notificationUnreadByCategory: {},
      notificationDedup: {},
      connectionRequests: {},
      messageThreads: {},
      businessEnquiries: []
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
  s.saves = s.saves || {};
  s.connects = s.connects || {}; // { userId: { serviceKey: { connected:true, createdAt, meta } } }
  s.videos = s.videos || {};
  s.creators = s.creators || {};
  s.creatorPosts = s.creatorPosts || [];
  s.businessProfiles = s.businessProfiles || {};
  s.userSettings = s.userSettings || {};
  s.platform = s.platform || { totalEarnings: 0 };
  s.notificationsById = s.notificationsById || {};
  s.notificationsByUser = s.notificationsByUser || {};
  s.notificationUnreadCounts = s.notificationUnreadCounts || {};
  s.notificationUnreadByCategory = s.notificationUnreadByCategory || {};
  s.notificationDedup = s.notificationDedup || {};
  s.connectionRequests = s.connectionRequests || {};
  s.messageThreads = s.messageThreads || {};
  s.businessEnquiries = Array.isArray(s.businessEnquiries) ? s.businessEnquiries : [];
  const legacySmartReach = s.smartReach || null;
  if (!smartReachDb) {
    s.smartReach = legacySmartReach || {
      config: defaultSmartReachConfig(),
      content: {},
      userFeeds: {},
      userProfiles: {},
      indexes: {
        usersByInterest: {},
        usersByLocation: {},
        usersByCategoryEngagement: {},
        contentByCategory: {},
        contentByLocation: {},
        contentByAuthor: {}
      },
      userActions: {
        notInterested: {},
        blockedUsers: {},
        reportedContent: {}
      },
      analytics: {
        events: [],
        recommendation: { feedRequests: 0, feedServedItems: 0 }
      }
    };
  } else {
    s.smartReach = smartReachDb.loadState(defaultSmartReachConfig(), legacySmartReach);
  }
  // backfill AFRIQORA IDs for existing users created before afriqoraId was added
  if (s.users && typeof s.users === 'object') {
    Object.keys(s.users).forEach((uid) => {
      if (!s.users[uid].afriqoraId) s.users[uid].afriqoraId = generateAfriqoraId();
    });
  }
  (s.creatorPosts || []).forEach((post) => {
    if (!post || !post.id) return;
    if (!((s.smartReach || {}).content || {})[String(post.id)]) {
      try { upsertSmartReachContent(s, post); } catch (e) {}
    }
  });
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
  header.split(';').forEach(pair => { const idx = pair.indexOf('='); if (idx === -1) return; const k = pair.slice(0, idx).trim(); const v = pair.slice(idx+1).trim(); out[k] = decodeURIComponent(v); });
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
  } catch (e) {}
  next();
}
const app = express();
app.use(attachSession);

const allowedOrigins = new Set([
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:4010',
  'http://127.0.0.1:4010'
]);
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    return callback(null, allowedOrigins.has(origin));
  },
  credentials: true
}));
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

function isDisallowedPlaceholderMediaUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return false;
  try {
    const u = new URL(raw);
    return /(^|\.)example\.com$/i.test(String(u.hostname || ''));
  } catch (e) {
    return /example\.com/i.test(raw);
  }
}

function normalizeOptionalDataUrl(value, maxLen = 800000) {
  const str = sanitizeText(value, maxLen);
  if (!str) return null;
  if (isDisallowedPlaceholderMediaUrl(str)) return null;
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
  const saves = Object.keys(((state.saves || {})[postId] || {})).length;
  return { views, likes, comments, shares, saves };
}

function toPublicPost(state, post) {
  const stats = buildPostStats(state, post);
  const smartReach = ((state.smartReach || {}).content || {})[String(post.id)] || null;
  const image = normalizeOptionalDataUrl(post.image, 800000);
  const video = normalizeOptionalDataUrl(post.video, 1800000);
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    category: post.category || '',
    location: post.location || '',
    website: post.website || '',
    contact: post.contact || '',
    image,
    video,
    status: post.status || 'published',
    createdAt: post.createdAt,
    updatedAt: post.updatedAt || null,
    ownerAfriqoraId: post.ownerAfriqoraId,
    ownerDisplayName: post.ownerDisplayName || '',
    ownerUserId: post.ownerUserId,
    contentType: post.contentType || (video ? 'video' : 'post'),
    postKind: post.postKind || (((state.businessProfiles || {})[String(post.ownerUserId)]) ? 'business' : 'creator'),
    business: (state.businessProfiles || {})[String(post.ownerUserId)] || null,
    topics: Array.isArray(post.topics) ? post.topics : [],
    publishedAt: post.publishedAt || post.createdAt,
    authorLocationAllowed: !!post.authorLocationAllowed,
    videoProcessing: post.videoProcessing || null,
    engagement: stats,
    smartReach: smartReach ? {
      stage: smartReach.stage,
      score: Number(smartReach.lastScore || 0),
      impressions: Number((smartReach.metrics && smartReach.metrics.impressions) || 0),
      views: Number((smartReach.metrics && smartReach.metrics.views) || 0),
      watchTimeMs: Number((smartReach.metrics && smartReach.metrics.watchTimeMs) || 0),
      completions: Number((smartReach.metrics && smartReach.metrics.completions) || 0),
      notInterested: Number((smartReach.metrics && smartReach.metrics.notInterested) || 0),
      reports: Number((smartReach.metrics && smartReach.metrics.reports) || 0)
    } : null
  };
}

function normalizeTag(value, maxLen = 64) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s_-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

function tokenizeTopicInput(input, fallbackCategory) {
  const out = [];
  if (Array.isArray(input)) {
    input.forEach((item) => {
      const cleaned = normalizeTag(item, 48);
      if (cleaned) out.push(cleaned);
    });
  } else if (typeof input === 'string') {
    input.split(',').forEach((item) => {
      const cleaned = normalizeTag(item, 48);
      if (cleaned) out.push(cleaned);
    });
  }
  const fallback = normalizeTag(fallbackCategory || '', 48);
  if (fallback && !out.includes(fallback)) out.push(fallback);
  return Array.from(new Set(out)).slice(0, 8);
}

function ensureUserFeedBuckets(state, userId) {
  const uid = String(userId || '');
  state.smartReach.userFeeds[uid] = state.smartReach.userFeeds[uid] || { home: [], recommended: [], discovery: [], following: [] };
  return state.smartReach.userFeeds[uid];
}

function addIndexMembership(indexMap, key, value) {
  const k = normalizeTag(key, 80);
  if (!k || !value) return;
  indexMap[k] = indexMap[k] || {};
  indexMap[k][String(value)] = Date.now();
}

function removeIndexMembership(indexMap, key, value) {
  const k = normalizeTag(key, 80);
  if (!k || !indexMap[k]) return;
  delete indexMap[k][String(value)];
  if (!Object.keys(indexMap[k]).length) delete indexMap[k];
}

function getIndexedIds(indexMap, key) {
  const k = normalizeTag(key, 80);
  if (!k || !indexMap[k]) return [];
  return Object.keys(indexMap[k]);
}

function getUserLocationHint(state, userId) {
  const uid = String(userId || '');
  const profile = ((state.smartReach || {}).userProfiles || {})[uid] || {};
  if (profile.location) return normalizeTag(profile.location, 80);
  const settings = (state.userSettings || {})[uid];
  if (settings && settings.privacy && settings.privacy.locationSharing && settings.languageRegion && settings.languageRegion.country) {
    return normalizeTag(settings.languageRegion.country, 80);
  }
  const business = (state.businessProfiles || {})[uid];
  if (business && business.location) return normalizeTag(business.location, 80);
  return '';
}

function buildContentFingerprint(post) {
  const source = [post.ownerUserId, post.title, post.content, post.category, post.video || '', post.image || ''].join('|').toLowerCase();
  return crypto.createHash('sha1').update(source).digest('hex');
}

function upsertSmartReachContent(state, post) {
  const contentId = String(post.id);
  const topics = tokenizeTopicInput(post.topics, post.category);
  const locationKey = normalizeTag(post.location || '', 80);
  const fp = buildContentFingerprint(post);
  const authorBucket = state.smartReach.indexes.contentByAuthor[String(post.ownerUserId)] || {};
  const repeatedByAuthor = Object.values(authorBucket).some((meta) => meta && meta.fingerprint === fp);

  const existing = state.smartReach.content[contentId] || {};
  const meta = Object.assign({}, existing, {
    contentId,
    ownerUserId: String(post.ownerUserId),
    ownerAfriqoraId: String(post.ownerAfriqoraId || ''),
    contentType: post.contentType || (post.video ? 'video' : 'post'),
    category: normalizeTag(post.category || '', 80),
    topics,
    location: locationKey,
    publishedAt: post.publishedAt || post.createdAt || new Date().toISOString(),
    stage: existing.stage || 'initial',
    targetedUsers: existing.targetedUsers || {},
    metrics: existing.metrics || {
      impressions: 0,
      views: 0,
      watchTimeMs: 0,
      completions: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      profileVisits: 0,
      followsGenerated: 0,
      notInterested: 0,
      skips: 0,
      reports: 0,
      uniqueBySignal: {}
    },
    eventDedup: existing.eventDedup || {},
    lastScore: Number(existing.lastScore || 0),
    fingerprint: fp,
    repeatedByAuthor,
    businessProfile: state.businessProfiles[String(post.ownerUserId)] || null,
    videoPrepared: !!post.videoProcessing
  });

  state.smartReach.content[contentId] = meta;
  state.smartReach.indexes.contentByAuthor[String(post.ownerUserId)] = state.smartReach.indexes.contentByAuthor[String(post.ownerUserId)] || {};
  state.smartReach.indexes.contentByAuthor[String(post.ownerUserId)][contentId] = { fingerprint: fp, createdAt: meta.publishedAt };

  topics.forEach((topic) => addIndexMembership(state.smartReach.indexes.contentByCategory, topic, contentId));
  if (meta.category) addIndexMembership(state.smartReach.indexes.contentByCategory, meta.category, contentId);
  if (locationKey) addIndexMembership(state.smartReach.indexes.contentByLocation, locationKey, contentId);
  return meta;
}

function enqueueContentForUsers(state, contentId, userIds, feedBuckets) {
  const cid = String(contentId);
  const buckets = Array.isArray(feedBuckets) && feedBuckets.length ? feedBuckets : ['home', 'recommended'];
  userIds.forEach((uid) => {
    const bucket = ensureUserFeedBuckets(state, uid);
    buckets.forEach((feedKey) => {
      const list = bucket[feedKey] || [];
      if (!list.includes(cid)) list.unshift(cid);
      bucket[feedKey] = list.slice(0, 1200);
    });
    const contentMeta = state.smartReach.content[cid];
    if (contentMeta) contentMeta.targetedUsers[String(uid)] = Date.now();
  });
}

function getFollowedCreatorIds(state, userId) {
  const follows = (((state.follows || {}).followingByUser || {})[String(userId)] || {});
  return Object.keys(follows);
}

function buildInitialAudience(state, contentMeta) {
  const cfg = state.smartReach.config;
  const ownerId = String(contentMeta.ownerUserId);
  const audience = new Set();
  const followerMap = (((state.follows || {}).followersByCreator || {})[String(contentMeta.ownerAfriqoraId)] || {});
  Object.keys(followerMap).forEach((uid) => { if (String(uid) !== ownerId) audience.add(String(uid)); });

  const catCandidates = getIndexedIds(state.smartReach.indexes.usersByInterest, contentMeta.category);
  catCandidates.forEach((uid) => { if (String(uid) !== ownerId) audience.add(String(uid)); });
  (contentMeta.topics || []).forEach((topic) => {
    getIndexedIds(state.smartReach.indexes.usersByInterest, topic).forEach((uid) => { if (String(uid) !== ownerId) audience.add(String(uid)); });
  });

  if (contentMeta.location) {
    getIndexedIds(state.smartReach.indexes.usersByLocation, contentMeta.location).forEach((uid) => { if (String(uid) !== ownerId) audience.add(String(uid)); });
  }
  getIndexedIds(state.smartReach.indexes.usersByCategoryEngagement, contentMeta.category).forEach((uid) => { if (String(uid) !== ownerId) audience.add(String(uid)); });
  return Array.from(audience).slice(0, Number(cfg.initialPoolSize || 40));
}

function computeGlobalEngagementQuality(contentMeta) {
  const m = contentMeta.metrics || {};
  const impressions = Math.max(1, Number(m.impressions || 0));
  const views = Number(m.views || 0);
  const completions = Number(m.completions || 0);
  const likes = Number(m.likes || 0);
  const comments = Number(m.comments || 0);
  const shares = Number(m.shares || 0);
  const saves = Number(m.saves || 0);
  const notInterested = Number(m.notInterested || 0);
  const skips = Number(m.skips || 0);
  const viewRate = Math.min(1, views / impressions);
  const completionRate = views ? Math.min(1, completions / views) : 0;
  const positiveRate = views ? Math.min(1, (likes + comments + shares + saves) / views) : 0;
  const negativeRate = Math.min(1, (notInterested + skips) / impressions);
  return Number(((viewRate * 0.38) + (completionRate * 0.28) + (positiveRate * 0.24) - (negativeRate * 0.3)).toFixed(6));
}

function maybeExpandContentReach(state, contentId) {
  const cid = String(contentId);
  const contentMeta = state.smartReach.content[cid];
  if (!contentMeta) return;
  const thresholds = state.smartReach.config.stageThresholds || {};
  const impressions = Number((contentMeta.metrics && contentMeta.metrics.impressions) || 0);
  const quality = computeGlobalEngagementQuality(contentMeta);
  contentMeta.lastScore = quality;

  if (contentMeta.stage === 'initial' && impressions >= Number(thresholds.initialToExpandedMinImpressions || 25) && quality >= Number(thresholds.initialToExpandedMinScore || 0.62)) {
    contentMeta.stage = 'expanded';
    createNotification(state, {
      recipientUserId: String(contentMeta.ownerUserId || ''),
      actorUserId: '',
      type: 'recommendation_stage_expanded',
      objectId: cid,
      title: 'Your content is expanding',
      message: 'AFRIQORA Smart Reach expanded distribution for your content based on real engagement.',
      route: '#/activity',
      metadata: { contentId: cid, stage: 'expanded' },
      dedupeKey: 'rec-stage-expanded:' + cid
    });
    const expandedAudience = new Set(buildInitialAudience(state, contentMeta));
    Object.keys(state.users || {}).forEach((uid) => {
      const location = getUserLocationHint(state, uid);
      if (location && location === contentMeta.location) expandedAudience.add(uid);
    });
    enqueueContentForUsers(state, cid, Array.from(expandedAudience).slice(0, Number(state.smartReach.config.expandedPoolSize || 140)), ['home', 'recommended']);
  } else if (contentMeta.stage === 'expanded' && impressions >= Number(thresholds.expandedToDiscoveryMinImpressions || 120) && quality >= Number(thresholds.expandedToDiscoveryMinScore || 0.74)) {
    contentMeta.stage = 'discovery';
    createNotification(state, {
      recipientUserId: String(contentMeta.ownerUserId || ''),
      actorUserId: '',
      type: 'recommendation_stage_discovery',
      objectId: cid,
      title: 'Your content reached discovery',
      message: 'AFRIQORA Smart Reach moved your content into discovery distribution.',
      route: '#/activity',
      metadata: { contentId: cid, stage: 'discovery' },
      dedupeKey: 'rec-stage-discovery:' + cid
    });
    const broad = Object.keys(state.users || {}).filter((uid) => String(uid) !== String(contentMeta.ownerUserId));
    enqueueContentForUsers(state, cid, broad.slice(0, Number(state.smartReach.config.discoveryPoolSize || 320)), ['discovery', 'recommended']);
  }
}

function bumpUserInterestProfile(state, userId, contentMeta, signalWeight) {
  const uid = String(userId || '');
  if (!uid || !contentMeta) return;
  const p = state.smartReach.userProfiles[uid] || { interests: {}, location: '', interactions: 0, negatives: 0, updatedAt: null };
  const tags = Array.from(new Set([contentMeta.category].concat(contentMeta.topics || []).filter(Boolean)));
  tags.forEach((tag) => {
    const key = normalizeTag(tag, 80);
    if (!key) return;
    p.interests[key] = Number(p.interests[key] || 0) + Number(signalWeight || 0.1);
    addIndexMembership(state.smartReach.indexes.usersByInterest, key, uid);
    addIndexMembership(state.smartReach.indexes.usersByCategoryEngagement, key, uid);
  });
  const loc = getUserLocationHint(state, uid);
  if (loc) {
    p.location = loc;
    addIndexMembership(state.smartReach.indexes.usersByLocation, loc, uid);
  }
  p.interactions = Number(p.interactions || 0) + 1;
  p.updatedAt = new Date().toISOString();
  state.smartReach.userProfiles[uid] = p;
}

function recordSmartReachEvent(state, event) {
  const contentId = String(event.contentId || event.videoId || '');
  const userId = String(event.userId || '');
  const eventType = normalizeTag(event.eventType || '', 48);
  if (!contentId || !userId || !eventType) return { counted: false, reason: 'invalid' };
  const contentMeta = state.smartReach.content[contentId];
  if (!contentMeta) return { counted: false, reason: 'unknown-content' };
  if (String(contentMeta.ownerUserId) === userId && ['impression', 'view', 'watch_time', 'completion', 'like', 'share', 'save', 'profile_visit'].includes(eventType)) {
    return { counted: false, reason: 'self-action' };
  }
  contentMeta.eventDedup[userId] = contentMeta.eventDedup[userId] || {};
  const now = Date.now();
  const dedupeWindow = Number((state.smartReach.config.dedupeWindowsMs || {})[eventType] || 0);
  const last = Number(contentMeta.eventDedup[userId][eventType] || 0);
  if (dedupeWindow > 0 && last > 0 && (now - last) < dedupeWindow) return { counted: false, reason: 'deduped' };
  contentMeta.eventDedup[userId][eventType] = now;

  const m = contentMeta.metrics;
  const keyMap = {
    impression: 'impressions',
    view: 'views',
    completion: 'completions',
    like: 'likes',
    comment: 'comments',
    share: 'shares',
    save: 'saves',
    profile_visit: 'profileVisits',
    follows_generated: 'followsGenerated',
    not_interested: 'notInterested',
    skip: 'skips',
    report: 'reports'
  };
  if (keyMap[eventType]) m[keyMap[eventType]] = Number(m[keyMap[eventType]] || 0) + 1;
  if (eventType === 'watch_time') {
    const delta = Math.max(0, Math.min(600000, Number(event.watchTimeMs || 0)));
    m.watchTimeMs = Number(m.watchTimeMs || 0) + delta;
  }

  if (eventType === 'not_interested') {
    state.smartReach.userActions.notInterested[userId] = state.smartReach.userActions.notInterested[userId] || {};
    state.smartReach.userActions.notInterested[userId][contentId] = now;
  }
  if (eventType === 'report') {
    state.smartReach.userActions.reportedContent[userId] = state.smartReach.userActions.reportedContent[userId] || [];
    state.smartReach.userActions.reportedContent[userId].push({ contentId, createdAt: new Date().toISOString(), reason: sanitizeText(event.reason, 240) || 'unspecified' });
  }

  const positiveWeight = (eventType === 'like' || eventType === 'comment' || eventType === 'share' || eventType === 'save' || eventType === 'completion') ? 0.55 : 0.2;
  const negative = (eventType === 'not_interested' || eventType === 'skip') ? 1 : 0;
  if (negative) {
    const profile = state.smartReach.userProfiles[userId] || { interests: {}, location: '', interactions: 0, negatives: 0, updatedAt: null };
    profile.negatives = Number(profile.negatives || 0) + 1;
    profile.updatedAt = new Date().toISOString();
    state.smartReach.userProfiles[userId] = profile;
  } else {
    bumpUserInterestProfile(state, userId, contentMeta, positiveWeight);
  }

  const maxEvents = 2000;
  state.smartReach.analytics.events.push({ contentId, userId, eventType, source: sanitizeText(event.source, 80), createdAt: new Date().toISOString() });
  if (state.smartReach.analytics.events.length > maxEvents) state.smartReach.analytics.events = state.smartReach.analytics.events.slice(-maxEvents);
  maybeExpandContentReach(state, contentId);
  return { counted: true, stage: contentMeta.stage, score: Number(contentMeta.lastScore || 0) };
}

function computeRecommendationScore(state, contentMeta, viewerId) {
  const cfg = state.smartReach.config.scoring || defaultSmartReachConfig().scoring;
  const viewerProfile = state.smartReach.userProfiles[String(viewerId)] || { interests: {}, location: '', negatives: 0 };
  const followerOfAuthor = !!(((state.follows || {}).followingByUser || {})[String(viewerId)] || {})[String(contentMeta.ownerAfriqoraId)];
  const interestMatch = Array.from(new Set([contentMeta.category].concat(contentMeta.topics || []))).reduce((acc, tag) => {
    const k = normalizeTag(tag, 80);
    return acc + Number((viewerProfile.interests || {})[k] || 0);
  }, 0);
  const locationMatch = viewerProfile.location && contentMeta.location && viewerProfile.location === contentMeta.location ? 1 : 0;
  const businessMatch = contentMeta.businessProfile && contentMeta.businessProfile.category && normalizeTag(contentMeta.businessProfile.category, 80) === contentMeta.category ? 1 : 0;
  const relevance = (followerOfAuthor ? cfg.followBoost : 0) + Math.min(3, interestMatch * cfg.interestBoost) + (locationMatch ? cfg.locationBoost : 0) + (businessMatch ? cfg.businessBoost : 0);

  const quality = computeGlobalEngagementQuality(contentMeta);
  const ageHours = Math.max(0, (Date.now() - new Date(contentMeta.publishedAt).getTime()) / 3600000);
  const freshness = Math.exp(-ageHours / Math.max(1, Number(cfg.halfLifeHours || 48)));
  const negativeFactor = Math.min(2, Number(viewerProfile.negatives || 0) * 0.08);
  const repeatPenalty = contentMeta.repeatedByAuthor ? Number(cfg.repeatPenalty || 0.6) : 0;
  const score = (Number(cfg.relevance || 0.45) * relevance)
    + (Number(cfg.engagement || 0.35) * quality)
    + (Number(cfg.freshness || 0.2) * freshness)
    - (Number(cfg.negativePenalty || 1.2) * negativeFactor)
    - repeatPenalty;
  return Number(score.toFixed(6));
}

function canUserSeeContent(state, userId, post) {
  const uid = String(userId || '');
  const contentId = String(post.id);
  if (!uid) return false;
  if (String(post.ownerUserId) === uid) return true;
  const blocked = (((state.smartReach.userActions || {}).blockedUsers || {})[uid] || {});
  if (blocked[String(post.ownerUserId)]) return false;
  const blockedByAuthor = (((state.smartReach.userActions || {}).blockedUsers || {})[String(post.ownerUserId)] || {});
  if (blockedByAuthor[uid]) return false;
  const notInterested = (((state.smartReach.userActions || {}).notInterested || {})[uid] || {});
  if (notInterested[contentId]) return false;

  const status = String(post.status || 'published').toLowerCase();
  const authorSettings = (state.userSettings || {})[String(post.ownerUserId)] || {};
  const profileVisibility = String((((authorSettings || {}).privacy || {}).profileVisibility) || 'public').toLowerCase();
  const following = !!((((state.follows || {}).followingByUser || {})[uid] || {})[String(post.ownerAfriqoraId)]);

  if (status === 'private') return false;
  if (status === 'followers' && !following) return false;
  if (profileVisibility === 'private') return false;
  if (profileVisibility === 'community' && !following) return false;
  return true;
}

function canAnonymousSeeContent(state, post) {
  const status = String(post.status || 'published').toLowerCase();
  if (status === 'private' || status === 'followers') return false;
  const authorSettings = (state.userSettings || {})[String(post.ownerUserId)] || {};
  const profileVisibility = String((((authorSettings || {}).privacy || {}).profileVisibility) || 'public').toLowerCase();
  if (profileVisibility !== 'public') return false;
  return true;
}

function isBlockedBetween(state, viewerId, ownerUserId) {
  const uid = String(viewerId || '');
  const owner = String(ownerUserId || '');
  if (!uid || !owner || uid === owner) return false;
  const blocked = (((state.smartReach || {}).userActions || {}).blockedUsers || {});
  return !!((blocked[uid] && blocked[uid][owner]) || (blocked[owner] && blocked[owner][uid]));
}

function canDiscoverUserProfile(state, viewerId, user) {
  if (!user || !user.id) return false;
  const uid = String(viewerId || '');
  const ownerId = String(user.id);
  if (uid && isBlockedBetween(state, uid, ownerId)) return false;
  if (uid && uid === ownerId) return true;
  const authorSettings = (state.userSettings || {})[ownerId] || {};
  const profileVisibility = String((((authorSettings || {}).privacy || {}).profileVisibility) || 'public').toLowerCase();
  if (profileVisibility === 'private') return false;
  if (profileVisibility === 'community') {
    if (!uid) return false;
    const following = !!((((state.follows || {}).followingByUser || {})[uid] || {})[String(user.afriqoraId || '')]);
    return following;
  }
  return true;
}

function findUserByAfriqoraId(state, afriqoraId) {
  const target = String(afriqoraId || '');
  if (!target) return null;
  return Object.values(state.users || {}).find((u) => String(u.afriqoraId || '') === target) || null;
}

function findPostByContentId(state, contentId) {
  const cid = String(contentId || '');
  if (!cid) return null;
  return (state.creatorPosts || []).find((p) => String(p.id) === cid) || null;
}

function notificationCategoryForType(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('message')) return 'messages';
  if (t.includes('follow') || t.includes('connection')) return 'connections';
  if (t.includes('enquiry') || t.includes('business')) return 'business';
  if (t.includes('system') || t.includes('security') || t.includes('announcement') || t.includes('service')) return 'system';
  if (t.includes('recommend')) return 'recommendation';
  return 'social';
}

function ensureNotificationIndexes(state, userId) {
  const uid = String(userId || '');
  state.notificationsByUser[uid] = state.notificationsByUser[uid] || [];
  state.notificationUnreadCounts[uid] = Number(state.notificationUnreadCounts[uid] || 0);
  state.notificationUnreadByCategory[uid] = state.notificationUnreadByCategory[uid] || {};
  return {
    ids: state.notificationsByUser[uid],
    unreadCount: state.notificationUnreadCounts[uid],
    unreadByCategory: state.notificationUnreadByCategory[uid]
  };
}

function canNotifyRecipient(state, recipientUserId, actorUserId, contentId) {
  const recipientId = String(recipientUserId || '');
  const actorId = String(actorUserId || '');
  if (!recipientId) return false;
  if (actorId && actorId === recipientId) return false;
  if (actorId && (!state.users || !state.users[actorId])) return false;
  if (actorId && isBlockedBetween(state, recipientId, actorId)) return false;

  if (actorId) {
    const actorUser = state.users[actorId] || null;
    if (actorUser && !canDiscoverUserProfile(state, recipientId, actorUser)) return false;
  }

  const post = findPostByContentId(state, contentId);
  if (post && String(post.ownerUserId) !== recipientId && !canUserSeeContent(state, recipientId, post)) return false;
  return true;
}

function createNotification(state, payload) {
  const recipientUserId = String(payload && payload.recipientUserId ? payload.recipientUserId : '');
  const actorUserId = payload && payload.actorUserId ? String(payload.actorUserId) : '';
  const objectId = payload && payload.objectId ? String(payload.objectId) : '';
  if (!recipientUserId) return null;
  if (!canNotifyRecipient(state, recipientUserId, actorUserId, objectId)) return null;

  const type = normalizeTag((payload && payload.type) || '', 64) || 'system';
  const category = notificationCategoryForType(type);
  const dedupeKey = String((payload && payload.dedupeKey) || [recipientUserId, type, actorUserId || '-', objectId || '-', String((payload && payload.route) || '-')].join('|'));
  if (state.notificationDedup[dedupeKey]) return null;

  const nowIso = new Date().toISOString();
  const id = 'n-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const actorUser = actorUserId ? ((state.users || {})[actorUserId] || null) : null;
  const note = {
    id,
    recipientUserId,
    actorUserId: actorUserId || null,
    actorDisplayName: actorUser ? String(actorUser.displayName || actorUser.afriqoraId || actorUser.id || '') : '',
    type,
    category,
    objectId: objectId || null,
    title: sanitizeText((payload && payload.title) || '', 140) || 'AFRIQORA update',
    message: sanitizeText((payload && payload.message) || '', 400) || '',
    route: sanitizeText((payload && payload.route) || '#/notifications', 220) || '#/notifications',
    metadata: payload && typeof payload.metadata === 'object' ? payload.metadata : {},
    createdAt: nowIso,
    read: false,
    readAt: null
  };

  state.notificationsById[id] = note;
  const idx = ensureNotificationIndexes(state, recipientUserId);
  idx.ids.unshift(id);
  if (idx.ids.length > 1200) {
    const trimmed = idx.ids.splice(1200);
    trimmed.forEach((rid) => {
      const existing = state.notificationsById[rid];
      if (existing && !existing.read) {
        const cat = String(existing.category || 'social');
        state.notificationUnreadCounts[recipientUserId] = Math.max(0, Number(state.notificationUnreadCounts[recipientUserId] || 0) - 1);
        const byCat = state.notificationUnreadByCategory[recipientUserId] || {};
        byCat[cat] = Math.max(0, Number(byCat[cat] || 0) - 1);
        state.notificationUnreadByCategory[recipientUserId] = byCat;
      }
      delete state.notificationsById[rid];
    });
  }

  state.notificationUnreadCounts[recipientUserId] = Number(state.notificationUnreadCounts[recipientUserId] || 0) + 1;
  const byCat = state.notificationUnreadByCategory[recipientUserId] || {};
  byCat[category] = Number(byCat[category] || 0) + 1;
  state.notificationUnreadByCategory[recipientUserId] = byCat;
  state.notificationDedup[dedupeKey] = { id, createdAt: nowIso };
  return note;
}

function markNotificationRead(state, userId, notificationId) {
  const uid = String(userId || '');
  const nid = String(notificationId || '');
  const note = state.notificationsById[nid];
  if (!note || String(note.recipientUserId) !== uid) return null;
  if (note.read) return note;
  note.read = true;
  note.readAt = new Date().toISOString();
  state.notificationUnreadCounts[uid] = Math.max(0, Number(state.notificationUnreadCounts[uid] || 0) - 1);
  const cat = String(note.category || 'social');
  const byCat = state.notificationUnreadByCategory[uid] || {};
  byCat[cat] = Math.max(0, Number(byCat[cat] || 0) - 1);
  state.notificationUnreadByCategory[uid] = byCat;
  return note;
}

function markAllNotificationsRead(state, userId, category) {
  const uid = String(userId || '');
  const wantedCategory = category ? String(category) : '';
  const ids = (state.notificationsByUser[uid] || []).slice();
  let changed = 0;
  ids.forEach((id) => {
    const note = state.notificationsById[id];
    if (!note || note.read) return;
    if (wantedCategory && String(note.category || '') !== wantedCategory) return;
    markNotificationRead(state, uid, id);
    changed += 1;
  });
  return changed;
}

function getNotificationsPage(state, userId, cursor, limit) {
  const uid = String(userId || '');
  const ids = state.notificationsByUser[uid] || [];
  const safeCursor = Math.max(0, Number(cursor) || 0);
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 20));
  const pageIds = ids.slice(safeCursor, safeCursor + safeLimit);
  const items = pageIds.map((id) => state.notificationsById[id]).filter(Boolean);
  const nextCursor = (safeCursor + safeLimit) < ids.length ? (safeCursor + safeLimit) : null;
  return {
    items,
    total: ids.length,
    nextCursor,
    hasMore: nextCursor !== null,
    unreadCount: Number(state.notificationUnreadCounts[uid] || 0),
    unreadByCategory: Object.assign({}, state.notificationUnreadByCategory[uid] || {})
  };
}

function normalizeSearchText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s_-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenizeSearchText(value) {
  const norm = normalizeSearchText(value);
  if (!norm) return [];
  return Array.from(new Set(norm.split(' ').map((x) => x.trim()).filter(Boolean)));
}

function createSearchEntity(type, id, data) {
  const payload = data || {};
  const searchable = [payload.title, payload.subtitle, payload.text, payload.category, payload.location, (payload.topics || []).join(' ')].filter(Boolean).join(' ');
  const tokens = tokenizeSearchText(searchable);
  return {
    type,
    id: String(id),
    title: String(payload.title || ''),
    subtitle: String(payload.subtitle || ''),
    text: String(payload.text || ''),
    category: String(payload.category || ''),
    location: String(payload.location || ''),
    ownerUserId: payload.ownerUserId ? String(payload.ownerUserId) : '',
    ownerAfriqoraId: payload.ownerAfriqoraId ? String(payload.ownerAfriqoraId) : '',
    createdAt: payload.createdAt || null,
    updatedAt: payload.updatedAt || null,
    contentType: payload.contentType || '',
    topics: Array.isArray(payload.topics) ? payload.topics : [],
    scoreHints: payload.scoreHints || {},
    tokens,
    tokenSet: new Set(tokens),
    haystack: normalizeSearchText(searchable)
  };
}

function buildSearchIndex(state) {
  if (searchIndexCache.revision === searchStateRevision && searchIndexCache.index) return searchIndexCache.index;

  const entities = [];
  const tokenMap = new Map();
  const entityByKey = new Map();

  const addEntity = (entity) => {
    const key = entity.type + ':' + entity.id;
    entities.push(entity);
    entityByKey.set(key, entity);
    entity.tokens.forEach((token) => {
      if (!tokenMap.has(token)) tokenMap.set(token, new Set());
      tokenMap.get(token).add(key);
    });
  };

  Object.values(state.users || {}).forEach((u) => {
    addEntity(createSearchEntity('people', u.id, {
      title: u.displayName || 'AFRIQORA User',
      subtitle: u.afriqoraId || '',
      text: [u.displayName, u.afriqoraId].filter(Boolean).join(' '),
      ownerUserId: u.id,
      ownerAfriqoraId: u.afriqoraId || '',
      createdAt: u.createdAt,
      updatedAt: u.createdAt
    }));
  });

  Object.values(state.businessProfiles || {}).forEach((b) => {
    const category = String(b.category || '');
    const location = String(b.location || '');
    addEntity(createSearchEntity('businesses', b.id, {
      title: b.businessName || b.ownerDisplayName || 'Business',
      subtitle: [category, location].filter(Boolean).join(' | '),
      text: [b.businessName, b.ownerDisplayName, b.description, b.website, b.contact].filter(Boolean).join(' '),
      category,
      location,
      ownerUserId: b.ownerUserId,
      ownerAfriqoraId: b.ownerAfriqoraId,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt
    }));
    if (category) {
      addEntity(createSearchEntity('services', String(b.id) + '::' + normalizeSearchText(category), {
        title: category,
        subtitle: b.businessName || b.ownerDisplayName || 'Business service',
        text: [category, b.description, b.businessName, location].filter(Boolean).join(' '),
        category,
        location,
        ownerUserId: b.ownerUserId,
        ownerAfriqoraId: b.ownerAfriqoraId,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt
      }));
    }
  });

  const categorySeen = new Set();
  (state.creatorPosts || []).forEach((p) => {
    const category = String(p.category || '');
    const location = String(p.location || '');
    const base = {
      title: p.title || 'Post',
      subtitle: [p.ownerDisplayName, category].filter(Boolean).join(' | '),
      text: [p.title, p.content, p.ownerDisplayName, category, location, (p.topics || []).join(' ')].filter(Boolean).join(' '),
      category,
      location,
      ownerUserId: p.ownerUserId,
      ownerAfriqoraId: p.ownerAfriqoraId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt || p.createdAt,
      contentType: p.contentType || (p.video ? 'video' : 'post'),
      topics: Array.isArray(p.topics) ? p.topics : [],
      scoreHints: {
        smartReachScore: Number((((state.smartReach || {}).content || {})[String(p.id)] || {}).lastScore || 0)
      }
    };
    addEntity(createSearchEntity('posts', p.id, base));
    addEntity(createSearchEntity('content', p.id, base));
    if (p.video) addEntity(createSearchEntity('videos', p.id, base));

    if (category) {
      const ck = normalizeSearchText(category);
      if (!categorySeen.has(ck)) {
        categorySeen.add(ck);
        addEntity(createSearchEntity('categories', ck, {
          title: category,
          subtitle: 'Category',
          text: category,
          category,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt || p.createdAt
        }));
      }
    }
  });

  const index = {
    entities,
    tokenMap,
    entityByKey,
    tokens: Array.from(tokenMap.keys())
  };
  searchIndexCache = { revision: searchStateRevision, index };
  return index;
}

function inferQuerySignals(tokens) {
  const out = { location: '', category: '' };
  if (!tokens.length) return out;
  out.location = tokens[tokens.length - 1] || '';
  out.category = tokens[0] || '';
  return out;
}

function scoreSearchEntity(state, viewerId, entity, qNorm, tokens, signals) {
  const titleNorm = normalizeSearchText(entity.title);
  const subtitleNorm = normalizeSearchText(entity.subtitle);
  const locationNorm = normalizeSearchText(entity.location);
  const categoryNorm = normalizeSearchText(entity.category);
  let score = 0;

  if (qNorm && (titleNorm.includes(qNorm) || subtitleNorm.includes(qNorm))) score += 8;
  if (qNorm && entity.haystack.includes(qNorm)) score += 4;

  tokens.forEach((token) => {
    if (entity.tokenSet.has(token)) score += 3.4;
    else if (entity.haystack.includes(token)) score += 1.2;
    if (titleNorm.startsWith(token)) score += 1.1;
    if (categoryNorm === token) score += 2.4;
    if (locationNorm === token || locationNorm.includes(token)) score += 2.1;
  });

  if (signals.category && categoryNorm && categoryNorm.includes(signals.category)) score += 1.4;
  if (signals.location && locationNorm && locationNorm.includes(signals.location)) score += 1.6;

  if (viewerId && entity.ownerAfriqoraId) {
    const following = !!((((state.follows || {}).followingByUser || {})[String(viewerId)] || {})[String(entity.ownerAfriqoraId)]);
    if (following) score += 1.6;
  }

  const smartReachScore = Number((entity.scoreHints || {}).smartReachScore || 0);
  if (smartReachScore > 0) score += Math.min(1.4, smartReachScore);

  const recencyStamp = new Date(entity.updatedAt || entity.createdAt || 0).getTime();
  if (recencyStamp > 0) {
    const ageDays = Math.max(0, (Date.now() - recencyStamp) / 86400000);
    score += Math.max(0, 1.1 - (ageDays / 45));
  }

  return Number(score.toFixed(6));
}

function canSeeSearchEntity(state, viewerId, entity) {
  const uid = String(viewerId || '');
  if (entity.type === 'people') {
    const user = (state.users || {})[entity.id] || null;
    return canDiscoverUserProfile(state, uid, user);
  }
  if (entity.ownerUserId && uid && isBlockedBetween(state, uid, entity.ownerUserId)) return false;

  if (entity.type === 'posts' || entity.type === 'videos' || entity.type === 'content') {
    const post = (state.creatorPosts || []).find((p) => String(p.id) === String(entity.id));
    if (!post) return false;
    if (uid) return canUserSeeContent(state, uid, post);
    return canAnonymousSeeContent(state, post);
  }

  if (entity.type === 'businesses' || entity.type === 'services') {
    if (!entity.ownerUserId) return true;
    const owner = (state.users || {})[entity.ownerUserId] || null;
    return canDiscoverUserProfile(state, uid, owner);
  }
  return true;
}

function formatSearchResultItem(state, entity, score) {
  const out = {
    type: entity.type,
    id: entity.id,
    title: entity.title,
    subtitle: entity.subtitle,
    category: entity.category || '',
    location: entity.location || '',
    score: Number(score || 0),
    routeHint: entity.type === 'people' ? 'profile' : (entity.type === 'businesses' || entity.type === 'services' ? 'home' : 'home')
  };

  if (entity.type === 'people') {
    const u = (state.users || {})[entity.id] || null;
    out.afriqoraId = u && u.afriqoraId ? String(u.afriqoraId) : '';
  }
  if (entity.type === 'businesses' || entity.type === 'services') {
    const business = Object.values(state.businessProfiles || {}).find((b) => String(b.id) === String(entity.type === 'services' ? String(entity.id).split('::')[0] : entity.id));
    out.businessId = business ? String(business.id) : '';
    out.ownerAfriqoraId = business ? String(business.ownerAfriqoraId || '') : '';
  }
  if (entity.type === 'posts' || entity.type === 'videos' || entity.type === 'content') {
    const post = (state.creatorPosts || []).find((p) => String(p.id) === String(entity.id));
    if (post) {
      out.contentId = String(post.id);
      out.contentType = post.contentType || (post.video ? 'video' : 'post');
      out.ownerAfriqoraId = String(post.ownerAfriqoraId || '');
      out.preview = {
        image: normalizeOptionalDataUrl(post.image, 800000),
        video: normalizeOptionalDataUrl(post.video, 1800000),
        excerpt: String(post.content || '').slice(0, 180)
      };
    }
  }
  return out;
}

function runUnifiedSearch(state, viewerId, params) {
  const qRaw = sanitizeText(params.q || '', 160);
  const qNorm = normalizeSearchText(qRaw);
  const tokens = tokenizeSearchText(qNorm);
  if (!tokens.length) return { invalid: true, reason: 'query required' };

  const typeAllow = new Set(['people', 'businesses', 'services', 'posts', 'videos', 'content', 'categories']);
  const requestedTypes = String(params.types || '').split(',').map((x) => normalizeSearchText(x)).filter(Boolean);
  const activeTypes = requestedTypes.length ? requestedTypes.filter((x) => typeAllow.has(x)) : Array.from(typeAllow);
  const activeTypeSet = new Set(activeTypes);

  const limit = Math.max(1, Math.min(50, Number(params.limit) || 20));
  const cursor = Math.max(0, Number(params.cursor) || 0);
  const locationFilter = normalizeSearchText(params.location || '');
  const categoryFilter = normalizeSearchText(params.category || '');

  const index = buildSearchIndex(state);
  const keyCandidates = new Set();
  tokens.forEach((token) => {
    const direct = index.tokenMap.get(token);
    if (direct) direct.forEach((k) => keyCandidates.add(k));
  });
  if (!keyCandidates.size) {
    index.tokens.forEach((token) => {
      if (tokens.some((t) => token.startsWith(t))) {
        const set = index.tokenMap.get(token);
        if (set) set.forEach((k) => keyCandidates.add(k));
      }
    });
  }

  const signals = inferQuerySignals(tokens);
  const scored = [];
  keyCandidates.forEach((key) => {
    const entity = index.entityByKey.get(key);
    if (!entity) return;
    if (!activeTypeSet.has(entity.type)) return;
    if (!canSeeSearchEntity(state, viewerId, entity)) return;
    if (locationFilter && normalizeSearchText(entity.location || '').includes(locationFilter) === false && entity.haystack.includes(locationFilter) === false) return;
    if (categoryFilter && normalizeSearchText(entity.category || '').includes(categoryFilter) === false && entity.haystack.includes(categoryFilter) === false) return;
    const score = scoreSearchEntity(state, viewerId, entity, qNorm, tokens, signals);
    if (score <= 0) return;
    scored.push({ entity, score });
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const bt = new Date(b.entity.updatedAt || b.entity.createdAt || 0).getTime();
    const at = new Date(a.entity.updatedAt || a.entity.createdAt || 0).getTime();
    return bt - at;
  });

  const groups = { people: 0, businesses: 0, services: 0, posts: 0, videos: 0, content: 0, categories: 0 };
  scored.forEach((row) => {
    if (typeof groups[row.entity.type] === 'number') groups[row.entity.type] += 1;
  });

  const page = scored.slice(cursor, cursor + limit);
  const items = page.map((row) => formatSearchResultItem(state, row.entity, row.score));
  const nextCursor = (cursor + limit) < scored.length ? (cursor + limit) : null;
  return {
    invalid: false,
    q: qRaw,
    items,
    groups,
    total: scored.length,
    nextCursor,
    hasMore: nextCursor !== null
  };
}

function buildSearchSuggestions(state, viewerId, q, limit) {
  const qNorm = normalizeSearchText(q || '');
  const tokens = tokenizeSearchText(qNorm);
  if (!tokens.length) return [];
  const out = [];
  const seen = new Set();
  const index = buildSearchIndex(state);
  const first = tokens[0];

  index.tokens
    .filter((token) => token.startsWith(first))
    .slice(0, 8)
    .forEach((token) => {
      const text = token.length > 1 ? token : qNorm;
      if (!text || seen.has('q:' + text)) return;
      seen.add('q:' + text);
      out.push({ kind: 'query', text });
    });

  const searchPreview = runUnifiedSearch(state, viewerId, { q: qNorm, limit: Math.max(4, Math.min(20, Number(limit) || 8)), cursor: 0 });
  (searchPreview.items || []).slice(0, 8).forEach((item) => {
    const k = item.type + ':' + item.id;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({
      kind: 'entity',
      type: item.type,
      id: item.id,
      text: item.title,
      subtitle: item.subtitle || ''
    });
  });
  return out.slice(0, Math.max(1, Math.min(12, Number(limit) || 8)));
}

function buildHomeFeedCandidateIds(state, userId) {
  const uid = String(userId || '');
  const feed = ensureUserFeedBuckets(state, uid);
  const seen = new Set();
  const out = [];

  function addMany(ids) {
    (ids || []).forEach((id) => {
      const cid = String(id || '');
      if (!cid || seen.has(cid)) return;
      seen.add(cid);
      out.push(cid);
    });
  }

  addMany(feed.home || []);
  addMany(feed.recommended || []);
  addMany(feed.following || []);

  const followedCreators = getFollowedCreatorIds(state, uid);
  const followedRecent = (state.creatorPosts || [])
    .filter((p) => followedCreators.includes(String(p.ownerAfriqoraId)))
    .sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime())
    .slice(0, 300)
    .map((p) => String(p.id));
  addMany(followedRecent);

  const globalRecent = (state.creatorPosts || [])
    .filter((p) => String(p.status || 'published').toLowerCase() !== 'private')
    .sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime())
    .slice(0, 700)
    .map((p) => String(p.id));
  addMany(globalRecent);

  return out;
}

function pagedFeedFromIds(state, userId, feedKey, limit, cursor) {
  const uid = String(userId || '');
  const feed = ensureUserFeedBuckets(state, uid);
  const items = feedKey === 'home'
    ? buildHomeFeedCandidateIds(state, uid)
    : (Array.isArray(feed[feedKey]) ? feed[feedKey] : []);
  const pageLimit = Math.max(1, Math.min(50, Number(limit) || 20));
  const offset = Math.max(0, Number(cursor) || 0);
  const authorCount = {};
  const out = [];

  for (let i = offset; i < items.length && out.length < pageLimit; i++) {
    const contentId = String(items[i]);
    const post = (state.creatorPosts || []).find((p) => String(p.id) === contentId);
    if (!post || !canUserSeeContent(state, uid, post)) continue;
    const count = Number(authorCount[String(post.ownerUserId)] || 0);
    if (count >= Number(state.smartReach.config.maxFeedItemsPerAuthor || 3)) continue;
    authorCount[String(post.ownerUserId)] = count + 1;
    const contentMeta = state.smartReach.content[contentId];
    const item = toPublicPost(state, post);
    const baseScore = contentMeta ? computeRecommendationScore(state, contentMeta, uid) : 0;
    const following = !!((((state.follows || {}).followingByUser || {})[uid] || {})[String(post.ownerAfriqoraId)]);
    const ageHours = Math.max(0, (Date.now() - new Date(post.publishedAt || post.createdAt).getTime()) / 3600000);
    const recentBoost = Math.max(0, 1 - (ageHours / 72));
    item.recommendationScore = Number((baseScore + (following ? 0.38 : 0) + (recentBoost * 0.2)).toFixed(6));
    out.push(item);
  }

  out.sort((a, b) => Number(b.recommendationScore || 0) - Number(a.recommendationScore || 0));
  const nextCursor = offset + pageLimit;
  return { items: out, nextCursor: nextCursor < items.length ? nextCursor : null, hasMore: nextCursor < items.length };
}

function distributeNewContent(state, post) {
  const contentMeta = upsertSmartReachContent(state, post);
  const initialAudience = buildInitialAudience(state, contentMeta);
  const followerIds = Object.keys((((state.follows || {}).followersByCreator || {})[String(post.ownerAfriqoraId)] || {}));
  enqueueContentForUsers(state, post.id, initialAudience, ['home', 'recommended']);
  enqueueContentForUsers(state, post.id, followerIds, ['following', 'home']);
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
  state.videos[videoId].views = (state.videos[videoId].views||0) + 1;
  state.videos[videoId].uniqueViewers[viewerId] = now;
  state.videos[videoId].usedNonces = state.videos[videoId].usedNonces || {};
  state.videos[videoId].usedNonces[token.nonce] = now;
  // payout
  const gross = Number(state.settings.viewValue || 0) || 0;
  const creatorShare = +(gross * (Number(state.settings.creatorPct||70)/100)).toFixed(6);
  const platformShare = +(gross * (Number(state.settings.platformPct||30)/100)).toFixed(6);
  state.creators = state.creators || {};
  if (!state.creators[creatorId]) state.creators[creatorId] = { totalViews: 0, earnings: 0, availableBalance: 0, withdrawals: [] };
  state.creators[creatorId].totalViews = (state.creators[creatorId].totalViews||0) + 1;
  state.creators[creatorId].earnings = +(state.creators[creatorId].earnings + creatorShare).toFixed(6);
  state.creators[creatorId].availableBalance = +( (state.creators[creatorId].availableBalance||0) + creatorShare ).toFixed(6);
  state.platform.totalEarnings = +( (state.platform.totalEarnings||0) + platformShare ).toFixed(6);
  if (state.smartReach && state.smartReach.content && state.smartReach.content[String(videoId)]) {
    recordSmartReachEvent(state, { contentId: String(videoId), userId: String(viewerId), eventType: 'impression', source: 'monetization_view' });
    recordSmartReachEvent(state, { contentId: String(videoId), userId: String(viewerId), eventType: 'view', source: 'monetization_view' });
  }
  saveState(state);
  res.json({ counted: true, creatorShare, platformShare, settings: state.settings });
});

// get creator stats
app.get('/creator/:id', (req, res, next) => {
  const id = req.params.id;
  if (id === 'dashboard' || id === 'posts' || id === 'business-profile') return next();
  const state = ensureState();
  const c = state.creators[id] || { totalViews:0, earnings:0, availableBalance:0, withdrawals:[] };
  res.json({ creator: c, settings: state.settings, platform: state.platform });
});

// --- Social interactions: likes, comments, follows, shares ---

// like a video (unique per user)
app.post('/interactions/like', (req, res) => {
  const { videoId, userId } = req.body || {};
  const actorId = req.userId || userId;
  if (!videoId || !actorId) return res.status(400).json({ error: 'videoId and userId required' });
  const state = ensureState();
  state.likes = state.likes || {};
  state.likes[videoId] = state.likes[videoId] || {};
  if (state.likes[videoId][actorId]) return res.json({ ok: true, liked: false, reason: 'already' });
  state.likes[videoId][actorId] = Date.now();
  // ensure video record
  state.videos = state.videos || {};
  state.videos[videoId] = state.videos[videoId] || { views:0, uniqueViewers:{}, usedNonces:{} };
  if (state.smartReach && state.smartReach.content && state.smartReach.content[String(videoId)]) {
    recordSmartReachEvent(state, { contentId: String(videoId), userId: String(actorId), eventType: 'like', source: 'interactions_like' });
  }
  const post = findPostByContentId(state, videoId);
  const actor = (state.users || {})[String(actorId)] || null;
  if (post && actor) {
    createNotification(state, {
      recipientUserId: String(post.ownerUserId || ''),
      actorUserId: String(actor.id),
      type: 'post_like',
      objectId: String(videoId),
      title: 'New like on your post',
      message: (actor.displayName || 'A user') + ' liked your post.',
      route: '#/home?contentId=' + encodeURIComponent(String(videoId)),
      metadata: { contentId: String(videoId), action: 'like' },
      dedupeKey: 'like:' + String(videoId) + ':' + String(actor.id)
    });
  }
  saveState(state);
  return res.json({ ok: true, liked: true, likesCount: Object.keys(state.likes[videoId]).length });
});

// unlike a video
app.post('/interactions/unlike', (req, res) => {
  const { videoId, userId } = req.body || {};
  const actorId = req.userId || userId;
  if (!videoId || !actorId) return res.status(400).json({ error: 'videoId and userId required' });
  const state = ensureState();
  if (state.likes && state.likes[videoId] && state.likes[videoId][actorId]) {
    delete state.likes[videoId][actorId];
    saveState(state);
    return res.json({ ok: true, liked: false, likesCount: Object.keys(state.likes[videoId]||{}).length });
  }
  return res.json({ ok: true, liked: false, reason: 'not-found' });
});

// add a comment
app.post('/comments', (req, res) => {
  const { videoId, authorId, text, parentCommentId } = req.body || {};
  const actorId = req.userId || authorId;
  if (!videoId || !actorId || !text) return res.status(400).json({ error: 'videoId, authorId and text required' });
  const state = ensureState();
  const parentId = sanitizeText(parentCommentId, 80);
  const parent = parentId ? (state.comments || []).find((c) => String(c.id) === parentId && String(c.videoId) === String(videoId)) : null;
  const comment = {
    id: 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2,6),
    videoId: String(videoId),
    authorId: String(actorId),
    text: String(text),
    parentCommentId: parent ? String(parent.id) : null,
    createdAt: new Date().toISOString()
  };
  state.comments = state.comments || [];
  state.comments.push(comment);
  if (state.smartReach && state.smartReach.content && state.smartReach.content[String(videoId)]) {
    recordSmartReachEvent(state, { contentId: String(videoId), userId: String(actorId), eventType: 'comment', source: 'comments_create' });
  }

  const actor = (state.users || {})[String(actorId)] || null;
  const post = findPostByContentId(state, videoId);
  if (actor && post) {
    createNotification(state, {
      recipientUserId: String(post.ownerUserId || ''),
      actorUserId: String(actor.id),
      type: 'post_comment',
      objectId: String(videoId),
      title: 'New comment on your post',
      message: (actor.displayName || 'A user') + ' commented on your post.',
      route: '#/home?contentId=' + encodeURIComponent(String(videoId)),
      metadata: { contentId: String(videoId), commentId: String(comment.id), action: 'comment' },
      dedupeKey: 'comment:' + String(comment.id)
    });
  }

  if (actor && parent && String(parent.authorId || '') !== String(actor.id)) {
    createNotification(state, {
      recipientUserId: String(parent.authorId || ''),
      actorUserId: String(actor.id),
      type: 'comment_reply',
      objectId: String(videoId),
      title: 'New reply to your comment',
      message: (actor.displayName || 'A user') + ' replied to your comment.',
      route: '#/home?contentId=' + encodeURIComponent(String(videoId)),
      metadata: { contentId: String(videoId), commentId: String(comment.id), parentCommentId: String(parent.id) },
      dedupeKey: 'reply:' + String(comment.id)
    });
  }

  saveState(state);
  return res.json({ ok:true, comment });
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
app.post('/follow', (req, res) => {
  const { creatorId, followerId } = req.body || {};
  const actorId = req.userId || followerId;
  if (!creatorId || !actorId) return res.status(400).json({ error: 'creatorId and followerId required' });
  const state = ensureState();
  state.follows = state.follows || { followersByCreator: {}, followingByUser: {} };
  state.follows.followersByCreator[creatorId] = state.follows.followersByCreator[creatorId] || {};
  state.follows.followingByUser[actorId] = state.follows.followingByUser[actorId] || {};
  if (state.follows.followersByCreator[creatorId][actorId]) return res.json({ ok:true, followed:false, reason:'already' });
  state.follows.followersByCreator[creatorId][actorId] = Date.now();
  state.follows.followingByUser[actorId][creatorId] = Date.now();
  const recentByCreator = (state.creatorPosts || []).filter((p) => String(p.ownerAfriqoraId) === String(creatorId)).slice(0, 5);
  recentByCreator.forEach((p) => {
    if (state.smartReach && state.smartReach.content && state.smartReach.content[String(p.id)]) {
      recordSmartReachEvent(state, { contentId: String(p.id), userId: String(actorId), eventType: 'follows_generated', source: 'follow' });
    }
  });

  const actor = (state.users || {})[String(actorId)] || null;
  const creatorUser = findUserByAfriqoraId(state, creatorId);
  if (actor && creatorUser) {
    createNotification(state, {
      recipientUserId: String(creatorUser.id),
      actorUserId: String(actor.id),
      type: 'new_follower',
      objectId: String(creatorId),
      title: 'You have a new follower',
      message: (actor.displayName || 'A user') + ' followed you.',
      route: '#/profile',
      metadata: { followerUserId: String(actor.id), creatorAfriqoraId: String(creatorId) },
      dedupeKey: 'follow:' + String(creatorId) + ':' + String(actor.id)
    });
  }

  saveState(state);
  return res.json({ ok:true, followed:true, followersCount: Object.keys(state.follows.followersByCreator[creatorId]).length });
});

// unfollow
app.post('/unfollow', (req, res) => {
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
  return res.json({ ok:true, followed:false });
});

// share a video (record only)
app.post('/interactions/share', (req, res) => {
  const { videoId, userId, platform } = req.body || {};
  const actorId = req.userId || userId;
  if (!videoId || !actorId) return res.status(400).json({ error: 'videoId and userId required' });
  const state = ensureState();
  state.shares = state.shares || {};
  state.shares[videoId] = state.shares[videoId] || [];
  const shareRecord = { id: 'sh-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), userId: String(actorId), platform: platform||null, createdAt: new Date().toISOString() };
  state.shares[videoId].push(shareRecord);
  if (state.smartReach && state.smartReach.content && state.smartReach.content[String(videoId)]) {
    recordSmartReachEvent(state, { contentId: String(videoId), userId: String(actorId), eventType: 'share', source: 'interactions_share' });
  }
  const post = findPostByContentId(state, videoId);
  const actor = (state.users || {})[String(actorId)] || null;
  if (post && actor) {
    createNotification(state, {
      recipientUserId: String(post.ownerUserId || ''),
      actorUserId: String(actor.id),
      type: 'post_share',
      objectId: String(videoId),
      title: 'Your post was shared',
      message: (actor.displayName || 'A user') + ' shared your post.',
      route: '#/home?contentId=' + encodeURIComponent(String(videoId)),
      metadata: { contentId: String(videoId), shareId: String(shareRecord.id) },
      dedupeKey: 'share:' + String(shareRecord.id)
    });
  }
  saveState(state);
  return res.json({ ok:true, sharesCount: state.shares[videoId].length });
});

// save a post/video (unique per user)
app.post('/interactions/save', requireAuth, (req, res) => {
  const { videoId } = req.body || {};
  const userId = String(req.userId || '');
  if (!videoId || !userId) return res.status(400).json({ error: 'videoId required' });
  const state = ensureState();
  state.saves = state.saves || {};
  state.saves[videoId] = state.saves[videoId] || {};
  if (state.saves[videoId][userId]) return res.json({ ok: true, saved: false, reason: 'already', savesCount: Object.keys(state.saves[videoId]).length });
  state.saves[videoId][userId] = Date.now();
  if (state.smartReach && state.smartReach.content && state.smartReach.content[String(videoId)]) {
    recordSmartReachEvent(state, { contentId: String(videoId), userId, eventType: 'save', source: 'interactions_save' });
  }
  const post = findPostByContentId(state, videoId);
  const actor = (state.users || {})[userId] || null;
  if (post && actor) {
    createNotification(state, {
      recipientUserId: String(post.ownerUserId || ''),
      actorUserId: String(actor.id),
      type: 'content_save',
      objectId: String(videoId),
      title: 'Your content was saved',
      message: (actor.displayName || 'A user') + ' saved your content.',
      route: '#/home?contentId=' + encodeURIComponent(String(videoId)),
      metadata: { contentId: String(videoId) },
      dedupeKey: 'save:' + String(videoId) + ':' + String(actor.id)
    });
  }
  saveState(state);
  return res.json({ ok: true, saved: true, savesCount: Object.keys(state.saves[videoId]).length });
});

app.post('/interactions/unsave', requireAuth, (req, res) => {
  const { videoId } = req.body || {};
  const userId = String(req.userId || '');
  if (!videoId || !userId) return res.status(400).json({ error: 'videoId required' });
  const state = ensureState();
  state.saves = state.saves || {};
  state.saves[videoId] = state.saves[videoId] || {};
  if (state.saves[videoId][userId]) delete state.saves[videoId][userId];
  saveState(state);
  return res.json({ ok: true, saved: false, savesCount: Object.keys(state.saves[videoId]).length });
});

app.get('/interactions/saves', requireAuth, (req, res) => {
  const { videoId } = req.query || {};
  const userId = String(req.userId || '');
  if (!videoId) return res.status(400).json({ error: 'videoId required' });
  const state = ensureState();
  const savesFor = (state.saves && state.saves[videoId]) ? state.saves[videoId] : {};
  return res.json({ ok: true, videoId: String(videoId), savesCount: Object.keys(savesFor).length, saved: !!savesFor[userId] });
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

// query follow status and follower count
app.get('/follow/status', (req, res) => {
  const { creatorId, userId } = req.query || {};
  const state = ensureState();
  const followers = (state.follows && state.follows.followersByCreator && state.follows.followersByCreator[creatorId]) ? state.follows.followersByCreator[creatorId] : {};
  const followersCount = Object.keys(followers).length;
  const following = userId ? Boolean(state.follows && state.follows.followingByUser && state.follows.followingByUser[userId] && state.follows.followingByUser[userId][creatorId]) : false;
  res.json({ creatorId, followersCount, following });
});

app.post('/connections/request', requireAuth, (req, res) => {
  const state = ensureState();
  const body = req.body || {};
  const requesterUserId = String(req.userId || '');
  const targetUserIdRaw = sanitizeText(body.targetUserId, 80);
  const targetAfriqoraId = sanitizeText(body.targetAfriqoraId, 80);
  let targetUserId = targetUserIdRaw;
  if (!targetUserId && targetAfriqoraId) {
    const targetUser = findUserByAfriqoraId(state, targetAfriqoraId);
    targetUserId = targetUser ? String(targetUser.id) : '';
  }
  if (!targetUserId) return res.status(400).json({ error: 'targetUserId or targetAfriqoraId required' });
  if (targetUserId === requesterUserId) return res.status(400).json({ error: 'cannot connect to self' });
  if (!(state.users || {})[targetUserId]) return res.status(404).json({ error: 'target user not found' });
  if (isBlockedBetween(state, requesterUserId, targetUserId)) return res.status(403).json({ error: 'connection not allowed' });

  const existingPending = Object.values(state.connectionRequests || {}).find((r) =>
    String((r && r.requesterUserId) || '') === requesterUserId
    && String((r && r.targetUserId) || '') === targetUserId
    && String((r && r.status) || '') === 'pending');
  if (existingPending) return res.json({ ok: true, request: existingPending, created: false });

  const request = {
    id: 'cr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    requesterUserId,
    targetUserId,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: null
  };
  state.connectionRequests[request.id] = request;

  const actor = (state.users || {})[requesterUserId] || null;
  if (actor) {
    createNotification(state, {
      recipientUserId: targetUserId,
      actorUserId: requesterUserId,
      type: 'connection_request',
      objectId: request.id,
      title: 'New connection request',
      message: (actor.displayName || 'A user') + ' sent you a connection request.',
      route: '#/notifications',
      metadata: { requestId: request.id },
      dedupeKey: 'connection-request:' + request.id
    });
  }

  saveState(state);
  res.status(201).json({ ok: true, request, created: true });
});

app.post('/connections/respond', requireAuth, (req, res) => {
  const state = ensureState();
  const body = req.body || {};
  const requestId = sanitizeText(body.requestId, 80);
  const action = normalizeTag(body.action, 16);
  if (!requestId || !action) return res.status(400).json({ error: 'requestId and action required' });
  if (!['accept', 'decline'].includes(action)) return res.status(400).json({ error: 'action must be accept or decline' });
  const request = state.connectionRequests[requestId];
  if (!request) return res.status(404).json({ error: 'request not found' });
  if (String(request.targetUserId) !== String(req.userId)) return res.status(403).json({ error: 'forbidden' });
  if (String(request.status) !== 'pending') return res.json({ ok: true, request, changed: false });

  request.status = action === 'accept' ? 'accepted' : 'declined';
  request.updatedAt = new Date().toISOString();

  if (action === 'accept') {
    const requester = (state.users || {})[String(request.requesterUserId)] || null;
    const target = (state.users || {})[String(request.targetUserId)] || null;
    if (requester && target) {
      state.follows = state.follows || { followersByCreator: {}, followingByUser: {} };
      state.follows.followersByCreator[String(target.afriqoraId)] = state.follows.followersByCreator[String(target.afriqoraId)] || {};
      state.follows.followingByUser[String(requester.id)] = state.follows.followingByUser[String(requester.id)] || {};
      state.follows.followersByCreator[String(target.afriqoraId)][String(requester.id)] = Date.now();
      state.follows.followingByUser[String(requester.id)][String(target.afriqoraId)] = Date.now();

      state.follows.followersByCreator[String(requester.afriqoraId)] = state.follows.followersByCreator[String(requester.afriqoraId)] || {};
      state.follows.followingByUser[String(target.id)] = state.follows.followingByUser[String(target.id)] || {};
      state.follows.followersByCreator[String(requester.afriqoraId)][String(target.id)] = Date.now();
      state.follows.followingByUser[String(target.id)][String(requester.afriqoraId)] = Date.now();
    }
  }

  const actor = (state.users || {})[String(req.userId)] || null;
  if (actor) {
    createNotification(state, {
      recipientUserId: String(request.requesterUserId),
      actorUserId: String(req.userId),
      type: action === 'accept' ? 'connection_accepted' : 'connection_declined',
      objectId: String(request.id),
      title: action === 'accept' ? 'Connection request accepted' : 'Connection request update',
      message: (actor.displayName || 'A user') + (action === 'accept' ? ' accepted your connection request.' : ' declined your connection request.'),
      route: '#/profile',
      metadata: { requestId: request.id, action },
      dedupeKey: 'connection-response:' + request.id + ':' + action
    });
  }

  saveState(state);
  res.json({ ok: true, request, changed: true });
});

app.get('/connections/requests', requireAuth, (req, res) => {
  const state = ensureState();
  const mode = normalizeTag(req.query.mode || 'incoming', 20);
  const uid = String(req.userId || '');
  const rows = Object.values(state.connectionRequests || {}).filter((r) => {
    if (!r) return false;
    if (mode === 'outgoing') return String(r.requesterUserId) === uid;
    return String(r.targetUserId) === uid;
  }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  res.json({ ok: true, mode, requests: rows });
});

app.get('/messages/thread', requireAuth, (req, res) => {
  const state = ensureState();
  const uid = String(req.userId || '');
  const thread = Array.isArray(state.messageThreads[uid]) ? state.messageThreads[uid] : [];
  res.json({ ok: true, thread });
});

app.post('/messages/thread', requireAuth, (req, res) => {
  const state = ensureState();
  const uid = String(req.userId || '');
  const text = sanitizeText((req.body || {}).text, 1000);
  if (!text) return res.status(400).json({ error: 'text is required' });
  state.messageThreads[uid] = Array.isArray(state.messageThreads[uid]) ? state.messageThreads[uid] : [];
  const now = Date.now();
  const userMessage = { id: 'msg-' + now + '-u', from: 'self', text, createdAt: new Date(now).toISOString(), read: true };
  const supportMessage = {
    id: 'msg-' + (now + 1) + '-s',
    from: 'support',
    text: 'AFRIQORA Support received your message. We will follow up shortly.',
    createdAt: new Date(now + 1).toISOString(),
    read: false
  };
  state.messageThreads[uid].push(userMessage);
  state.messageThreads[uid].push(supportMessage);
  if (state.messageThreads[uid].length > 500) state.messageThreads[uid] = state.messageThreads[uid].slice(-500);

  createNotification(state, {
    recipientUserId: uid,
    actorUserId: '',
    type: 'message_received',
    objectId: supportMessage.id,
    title: 'New message in conversation',
    message: 'AFRIQORA Support replied in your conversation.',
    route: '#/messages',
    metadata: { messageId: supportMessage.id },
    dedupeKey: 'message-received:' + supportMessage.id
  });

  saveState(state);
  res.status(201).json({ ok: true, messages: [userMessage, supportMessage], threadSize: state.messageThreads[uid].length });
});

app.post('/business/enquiries', requireAuth, (req, res) => {
  const state = ensureState();
  const requesterUserId = String(req.userId || '');
  const businessId = sanitizeText((req.body || {}).businessId, 80);
  const message = sanitizeText((req.body || {}).message, 500);
  const contactMode = sanitizeText((req.body || {}).contactMode, 40) || 'in-app';
  if (!businessId || !message) return res.status(400).json({ error: 'businessId and message are required' });
  const business = Object.values(state.businessProfiles || {}).find((b) => String((b && b.id) || '') === businessId) || null;
  if (!business) return res.status(404).json({ error: 'business not found' });
  if (String(business.ownerUserId || '') === requesterUserId) return res.status(400).json({ error: 'cannot enquire your own business' });

  const enquiry = {
    id: 'enq-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    businessId,
    businessOwnerUserId: String(business.ownerUserId || ''),
    requesterUserId,
    message,
    contactMode,
    createdAt: new Date().toISOString()
  };
  state.businessEnquiries.unshift(enquiry);
  if (state.businessEnquiries.length > 5000) state.businessEnquiries = state.businessEnquiries.slice(0, 5000);

  const actor = (state.users || {})[requesterUserId] || null;
  if (actor) {
    createNotification(state, {
      recipientUserId: String(business.ownerUserId || ''),
      actorUserId: String(actor.id),
      type: 'business_enquiry',
      objectId: enquiry.id,
      title: 'New customer enquiry',
      message: (actor.displayName || 'A customer') + ' sent an enquiry about your business.',
      route: '#/notifications',
      metadata: { enquiryId: enquiry.id, businessId },
      dedupeKey: 'business-enquiry:' + enquiry.id
    });
  }

  saveState(state);
  res.status(201).json({ ok: true, enquiry });
});

app.get('/business/enquiries', requireAuth, (req, res) => {
  const state = ensureState();
  const scope = normalizeTag(req.query.scope || 'received', 20);
  const uid = String(req.userId || '');
  const rows = (state.businessEnquiries || []).filter((row) => {
    if (!row) return false;
    if (scope === 'sent') return String(row.requesterUserId) === uid;
    return String(row.businessOwnerUserId) === uid;
  });
  res.json({ ok: true, scope, enquiries: rows });
});

// video stats for feed/recommendations
app.get('/stats/video/:id', (req, res) => {
  const id = req.params.id;
  const state = ensureState();
  const video = state.videos && state.videos[id] ? state.videos[id] : { views:0 };
  const likesCount = state.likes && state.likes[id] ? Object.keys(state.likes[id]).length : 0;
  const commentsCount = (state.comments || []).filter(c=>String(c.videoId)===String(id)).length;
  const sharesCount = state.shares && state.shares[id] ? state.shares[id].length : 0;
  res.json({ videoId: id, views: Number(video.views||0), likes: likesCount, comments: commentsCount, shares: sharesCount });
});

// Connect module: list services connected for a user
app.get('/connect/services', (req, res) => {
  const userId = req.query.userId || req.query.uid || 'anonymous';
  const state = ensureState();
  const userConns = state.connects[userId] || {};
  res.json({ userId, services: userConns });
});

// --- Authentication: register, login, logout, me ---
app.post('/auth/register', (req, res) => {
  const { email, password, displayName } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const state = ensureState();
  // ensure unique email
  const existing = Object.values(state.users).find(u => String(u.email).toLowerCase() === String(email).toLowerCase());
  if (existing) return res.status(400).json({ error: 'email in use' });
  const userId = 'u-' + Date.now() + '-' + Math.random().toString(36).slice(2,6);
  const hash = bcrypt.hashSync(String(password), 10);
  state.users[userId] = {
    afriqoraId: generateAfriqoraId(),
    id: userId,
    email: String(email),
    passwordHash: hash,
    displayName: String(displayName),
    createdAt: new Date()
  };
  createNotification(state, {
    recipientUserId: userId,
    actorUserId: '',
    type: 'system_service_notice',
    objectId: userId,
    title: 'Welcome to AFRIQORA',
    message: 'Your AFRIQORA account is active. Complete your profile and review security settings.',
    route: '#/settings',
    metadata: { event: 'register' },
    dedupeKey: 'register-welcome:' + userId
  });
saveState(state);
  // create session
  const sid = createSession(state, userId);
  res.setHeader('Set-Cookie', `afr_session=${encodeURIComponent(sid)}; HttpOnly; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS/1000)}`);
  res.json({ ok:true, user: safeUser(state.users[userId]) });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const state = ensureState();
  const user = Object.values(state.users||{}).find(u => String(u.email).toLowerCase() === String(email).toLowerCase());
  if (!user) return res.status(400).json({ error: 'invalid credentials' });
  if (!bcrypt.compareSync(String(password), String(user.passwordHash))) return res.status(400).json({ error: 'invalid credentials' });
  if (!user.afriqoraId) user.afriqoraId = generateAfriqoraId();
  const loginHour = new Date().toISOString().slice(0, 13);
  createNotification(state, {
    recipientUserId: String(user.id),
    actorUserId: '',
    type: 'account_security',
    objectId: String(user.id),
    title: 'New sign-in detected',
    message: 'Your account signed in successfully just now.',
    route: '#/settings',
    metadata: { event: 'login' },
    dedupeKey: 'login-security:' + String(user.id) + ':' + loginHour
  });
  const sid = createSession(state, user.id);
  saveState(state);
  res.setHeader('Set-Cookie', `afr_session=${encodeURIComponent(sid)}; HttpOnly; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS/1000)}`);
  res.json({ ok:true, user: safeUser(user) });
});

app.post('/auth/logout', (req, res) => {
  const cookies = parseCookies(req); const sid = cookies['afr_session']; const state = ensureState(); if (sid && state.sessions && state.sessions[sid]) { delete state.sessions[sid]; saveState(state); }
  // expire cookie
  res.setHeader('Set-Cookie', `afr_session=deleted; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
  res.json({ ok:true });
});

app.get('/auth/me', (req, res) => {
  if (!req.userId) return res.json({ user: null });
  const state = ensureState(); const u = state.users && state.users[req.userId]; if (!u) return res.json({ user: null });
  if (!u.afriqoraId) {
    u.afriqoraId = generateAfriqoraId();
    saveState(state);
  }
  res.json({ user: safeUser(u) });
});

// --- Authenticated user settings persistence ---
app.get('/settings/preferences', requireAuth, (req, res) => {
  const state = ensureState();
  state.userSettings = state.userSettings || {};
  const stored = state.userSettings[req.userId] || null;
  const merged = mergeDefaultUserSettings(stored);
  if (!stored) {
    state.userSettings[req.userId] = merged;
    saveState(state);
  }
  res.json({ ok: true, settings: merged, updatedAt: stored && stored.updatedAt ? stored.updatedAt : null });
});

app.put('/settings/preferences', requireAuth, (req, res) => {
  const state = ensureState();
  state.userSettings = state.userSettings || {};
  const incoming = (req.body && req.body.settings) ? req.body.settings : req.body;
  const existing = state.userSettings[req.userId] || null;
  const sanitized = sanitizeUserSettings(incoming, existing);
  sanitized.updatedAt = new Date().toISOString();
  state.userSettings[req.userId] = sanitized;
  saveState(state);
  res.json({ ok: true, settings: sanitized, updatedAt: sanitized.updatedAt });
});

// --- Authenticated creator identity, profile, and post APIs ---
app.get('/creator/dashboard', requireAuth, (req, res) => {
  const state = ensureState();
  const user = state.users[req.userId];
  if (!user.afriqoraId) {
    user.afriqoraId = generateAfriqoraId();
    saveState(state);
  }
  state.creators = state.creators || {};
  const creatorStats = state.creators[user.afriqoraId] || { totalViews: 0, earnings: 0, availableBalance: 0, withdrawals: [] };
  const myPosts = (state.creatorPosts || [])
    .filter(p => String(p.ownerUserId) === String(user.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(p => toPublicPost(state, p));
  const businessProfile = state.businessProfiles[user.id] || null;
  res.json({
    ok: true,
    user: safeUser(user),
    creator: creatorStats,
    businessProfile,
    posts: myPosts,
    settings: state.settings
  });
});

app.post('/creator/business-profile', requireAuth, (req, res) => {
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
  res.json({ ok: true, businessProfile: profile });
});

app.post('/creator/posts', requireAuth, (req, res) => {
  const state = ensureState();
  const user = state.users[req.userId];
  const body = req.body || {};
  const title = sanitizeText(body.title, 180);
  const content = sanitizeText(body.content, 4000);
  if (!title || !content) return res.status(400).json({ error: 'title and content are required' });

  const post = {
    id: 'cp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    ownerUserId: user.id,
    ownerAfriqoraId: user.afriqoraId,
    ownerDisplayName: sanitizeText(user.displayName || 'Creator', 120),
    title,
    content,
    category: sanitizeText(body.category, 100),
    location: sanitizeText(body.location, 120),
    website: sanitizeText(body.website, 200),
    contact: sanitizeText(body.contact, 120),
    image: normalizeOptionalDataUrl(body.image, 800000),
    video: normalizeOptionalDataUrl(body.video, 1800000),
    contentType: normalizeTag(body.contentType || '', 24) || (normalizeOptionalDataUrl(body.video, 1800000) ? 'video' : 'post'),
    topics: tokenizeTopicInput(body.topics, body.category),
    publishedAt: new Date().toISOString(),
    authorLocationAllowed: !!(((state.userSettings || {})[req.userId] || {}).privacy || {}).locationSharing,
    authorLocation: ((((state.userSettings || {})[req.userId] || {}).privacy || {}).locationSharing ? sanitizeText(body.location, 120) : ''),
    videoProcessing: null,
    status: sanitizeText(body.status, 40) || 'published',
    createdAt: new Date().toISOString(),
    updatedAt: null
  };

  if (post.video) {
    post.contentType = 'video';
    post.videoProcessing = {
      processingStatus: 'prepared',
      preparedAt: new Date().toISOString(),
      cdnReady: false,
      sourceType: post.video.startsWith('data:video') ? 'inline-upload' : 'remote-url',
      playback: {
        mp4: post.video,
        hls: null,
        dash: null
      }
    };
  }

  state.creatorPosts = state.creatorPosts || [];
  state.creatorPosts.unshift(post);
  distributeNewContent(state, post);
  saveState(state);
  res.status(201).json({ ok: true, post: toPublicPost(state, post) });
});

app.get('/creator/posts/mine', requireAuth, (req, res) => {
  const state = ensureState();
  const mine = (state.creatorPosts || [])
    .filter(p => String(p.ownerUserId) === String(req.userId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(p => toPublicPost(state, p));
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
  post.topics = tokenizeTopicInput(typeof body.topics !== 'undefined' ? body.topics : post.topics, body.category ?? post.category);
  post.location = sanitizeText(body.location ?? post.location, 120);
  post.website = sanitizeText(body.website ?? post.website, 200);
  post.contact = sanitizeText(body.contact ?? post.contact, 120);
  if (typeof body.image !== 'undefined') post.image = normalizeOptionalDataUrl(body.image, 800000);
  if (typeof body.video !== 'undefined') post.video = normalizeOptionalDataUrl(body.video, 1800000);
  post.contentType = post.video ? 'video' : 'post';
  post.publishedAt = post.publishedAt || post.createdAt;
  post.authorLocationAllowed = !!((((state.userSettings || {})[req.userId] || {}).privacy || {}).locationSharing);
  post.authorLocation = post.authorLocationAllowed ? post.location : '';
  post.videoProcessing = post.video ? {
    processingStatus: 'prepared',
    preparedAt: new Date().toISOString(),
    cdnReady: false,
    sourceType: post.video.startsWith('data:video') ? 'inline-upload' : 'remote-url',
    playback: {
      mp4: post.video,
      hls: (post.videoProcessing && post.videoProcessing.playback && post.videoProcessing.playback.hls) || null,
      dash: (post.videoProcessing && post.videoProcessing.playback && post.videoProcessing.playback.dash) || null
    }
  } : null;
  if (typeof body.status !== 'undefined') post.status = sanitizeText(body.status, 40) || 'published';
  post.updatedAt = new Date().toISOString();

  state.creatorPosts[idx] = post;
  upsertSmartReachContent(state, post);
  saveState(state);
  res.json({ ok: true, post: toPublicPost(state, post) });
});

app.delete('/creator/posts/:id', requireAuth, (req, res) => {
  const state = ensureState();
  const idx = (state.creatorPosts || []).findIndex(p => String(p.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'post not found' });
  const post = state.creatorPosts[idx];
  if (String(post.ownerUserId) !== String(req.userId)) return res.status(403).json({ error: 'forbidden' });
  const contentId = String(post.id);
  state.creatorPosts.splice(idx, 1);
  if (state.smartReach && state.smartReach.content) {
    delete state.smartReach.content[contentId];
    removeIndexMembership(state.smartReach.indexes.contentByCategory, post.category, contentId);
    removeIndexMembership(state.smartReach.indexes.contentByLocation, post.location, contentId);
    tokenizeTopicInput(post.topics, post.category).forEach((topic) => removeIndexMembership(state.smartReach.indexes.contentByCategory, topic, contentId));
    Object.keys(state.smartReach.userFeeds || {}).forEach((uid) => {
      const feeds = state.smartReach.userFeeds[uid];
      Object.keys(feeds || {}).forEach((feedKey) => {
        feeds[feedKey] = (feeds[feedKey] || []).filter((id) => String(id) !== contentId);
      });
    });
  }
  saveState(state);
  res.json({ ok: true });
});

app.get('/creator/posts/public', (req, res) => {
  const state = ensureState();
  const q = sanitizeText(req.query.q || '', 200).toLowerCase();
  const category = sanitizeText(req.query.category || '', 100).toLowerCase();
  const location = sanitizeText(req.query.location || '', 120).toLowerCase();
  const items = (state.creatorPosts || [])
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
  res.json({ ok: true, posts: items });
});

// --- Smart Reach: scoring, feeds, distribution, and safety ---
app.put('/smart-reach/config', adminGuard, (req, res) => {
  const state = ensureState();
  const incoming = req.body || {};
  const current = state.smartReach.config || defaultSmartReachConfig();
  const next = JSON.parse(JSON.stringify(current));
  if (typeof incoming.initialPoolSize === 'number') next.initialPoolSize = Math.max(10, Math.min(300, Math.floor(incoming.initialPoolSize)));
  if (typeof incoming.expandedPoolSize === 'number') next.expandedPoolSize = Math.max(20, Math.min(1000, Math.floor(incoming.expandedPoolSize)));
  if (typeof incoming.discoveryPoolSize === 'number') next.discoveryPoolSize = Math.max(40, Math.min(3000, Math.floor(incoming.discoveryPoolSize)));
  if (typeof incoming.maxFeedItemsPerAuthor === 'number') next.maxFeedItemsPerAuthor = Math.max(1, Math.min(20, Math.floor(incoming.maxFeedItemsPerAuthor)));
  if (incoming.scoring && typeof incoming.scoring === 'object') {
    Object.keys(next.scoring || {}).forEach((k) => {
      if (typeof incoming.scoring[k] === 'number' && Number.isFinite(incoming.scoring[k])) next.scoring[k] = incoming.scoring[k];
    });
  }
  if (incoming.stageThresholds && typeof incoming.stageThresholds === 'object') {
    Object.keys(next.stageThresholds || {}).forEach((k) => {
      if (typeof incoming.stageThresholds[k] === 'number' && Number.isFinite(incoming.stageThresholds[k])) next.stageThresholds[k] = incoming.stageThresholds[k];
    });
  }
  state.smartReach.config = next;
  saveState(state);
  res.json({ ok: true, config: next });
});

app.get('/smart-reach/content/:id', requireAuth, (req, res) => {
  const state = ensureState();
  const contentId = String(req.params.id || '');
  const post = (state.creatorPosts || []).find((p) => String(p.id) === contentId);
  if (!post) return res.status(404).json({ error: 'content not found' });
  if (String(post.ownerUserId) !== String(req.userId) && String(req.query.adminKey || req.headers['x-admin-key'] || '') !== String(ADMIN_KEY)) {
    return res.status(403).json({ error: 'forbidden' });
  }
  const meta = state.smartReach.content[contentId] || null;
  res.json({ ok: true, content: toPublicPost(state, post), smartReach: meta });
});

app.post('/smart-reach/engagement', requireAuth, (req, res) => {
  const body = req.body || {};
  const contentId = sanitizeText(body.contentId || body.videoId, 80);
  const eventType = normalizeTag(body.eventType, 48);
  if (!contentId || !eventType) return res.status(400).json({ error: 'contentId and eventType are required' });
  const allowed = new Set(['impression', 'view', 'watch_time', 'completion', 'like', 'comment', 'share', 'save', 'profile_visit', 'follows_generated', 'not_interested', 'skip', 'report']);
  if (!allowed.has(eventType)) return res.status(400).json({ error: 'unsupported eventType' });
  const state = ensureState();
  if (!state.smartReach.content[contentId]) return res.status(404).json({ error: 'content not found' });
  const result = recordSmartReachEvent(state, {
    contentId,
    userId: req.userId,
    eventType,
    watchTimeMs: Number(body.watchTimeMs || 0),
    reason: body.reason,
    source: sanitizeText(body.source, 80) || 'feed'
  });
  saveState(state);
  res.json({ ok: true, result });
});

app.post('/content/not-interested', requireAuth, (req, res) => {
  const body = req.body || {};
  const contentId = sanitizeText(body.contentId || body.videoId, 80);
  if (!contentId) return res.status(400).json({ error: 'contentId is required' });
  const state = ensureState();
  const result = recordSmartReachEvent(state, { contentId, userId: req.userId, eventType: 'not_interested', reason: body.reason, source: 'not_interested' });
  saveState(state);
  res.json({ ok: true, result });
});

app.post('/users/block', requireAuth, (req, res) => {
  const state = ensureState();
  const body = req.body || {};
  const byId = sanitizeText(body.targetUserId, 80);
  const byAfriqoraId = sanitizeText(body.targetAfriqoraId, 80);
  let targetUserId = byId;
  if (!targetUserId && byAfriqoraId) {
    const user = Object.values(state.users || {}).find((u) => String(u.afriqoraId) === String(byAfriqoraId));
    targetUserId = user ? String(user.id) : '';
  }
  if (!targetUserId) return res.status(400).json({ error: 'targetUserId or targetAfriqoraId is required' });
  if (String(targetUserId) === String(req.userId)) return res.status(400).json({ error: 'cannot block self' });
  state.smartReach.userActions.blockedUsers[req.userId] = state.smartReach.userActions.blockedUsers[req.userId] || {};
  state.smartReach.userActions.blockedUsers[req.userId][targetUserId] = Date.now();
  saveState(state);
  res.json({ ok: true, blockedUserId: targetUserId });
});

app.post('/content/report', requireAuth, (req, res) => {
  const body = req.body || {};
  const contentId = sanitizeText(body.contentId || body.videoId, 80);
  if (!contentId) return res.status(400).json({ error: 'contentId is required' });
  const state = ensureState();
  const result = recordSmartReachEvent(state, {
    contentId,
    userId: req.userId,
    eventType: 'report',
    reason: sanitizeText(body.reason, 180) || 'general',
    source: 'report'
  });
  saveState(state);
  res.json({ ok: true, result });
});

function smartReachFeedHandler(feedKey) {
  return (req, res) => {
    const state = ensureState();
    const limit = Number(req.query.limit || 20);
    const cursor = Number(req.query.cursor || 0);
    const result = pagedFeedFromIds(state, req.userId, feedKey, limit, cursor);
    state.smartReach.analytics.recommendation.feedRequests = Number(state.smartReach.analytics.recommendation.feedRequests || 0) + 1;
    state.smartReach.analytics.recommendation.feedServedItems = Number(state.smartReach.analytics.recommendation.feedServedItems || 0) + Number(result.items.length || 0);
    saveState(state);
    res.json({ ok: true, feed: feedKey, items: result.items, nextCursor: result.nextCursor, hasMore: result.hasMore });
  };
}

app.get('/feed/home', requireAuth, smartReachFeedHandler('home'));
app.get('/feed/recommended', requireAuth, smartReachFeedHandler('recommended'));
app.get('/feed/discovery', requireAuth, smartReachFeedHandler('discovery'));
app.get('/feed/following', requireAuth, smartReachFeedHandler('following'));

app.get('/notifications', requireAuth, (req, res) => {
  const state = ensureState();
  const page = getNotificationsPage(state, req.userId, req.query.cursor, req.query.limit);
  res.json({ ok: true, ...page });
});

app.get('/notifications/unread-count', requireAuth, (req, res) => {
  const state = ensureState();
  const uid = String(req.userId || '');
  ensureNotificationIndexes(state, uid);
  res.json({
    ok: true,
    unreadCount: Number(state.notificationUnreadCounts[uid] || 0),
    unreadByCategory: Object.assign({}, state.notificationUnreadByCategory[uid] || {})
  });
});

app.post('/notifications/:id/read', requireAuth, (req, res) => {
  const state = ensureState();
  const note = markNotificationRead(state, req.userId, req.params.id);
  if (!note) return res.status(404).json({ error: 'notification not found' });
  saveState(state);
  res.json({ ok: true, notification: note, unreadCount: Number(state.notificationUnreadCounts[String(req.userId)] || 0) });
});

app.post('/notifications/read-all', requireAuth, (req, res) => {
  const state = ensureState();
  const category = sanitizeText((req.body || {}).category, 40).toLowerCase();
  const changed = markAllNotificationsRead(state, req.userId, category || '');
  saveState(state);
  res.json({ ok: true, changed, unreadCount: Number(state.notificationUnreadCounts[String(req.userId)] || 0) });
});

app.post('/notifications/system', adminGuard, (req, res) => {
  const state = ensureState();
  const body = req.body || {};
  const title = sanitizeText(body.title, 140);
  const message = sanitizeText(body.message, 400);
  const targetUserId = sanitizeText(body.targetUserId, 80);
  if (!title || !message) return res.status(400).json({ error: 'title and message required' });
  const recipients = targetUserId ? [targetUserId] : Object.keys(state.users || {});
  let created = 0;
  recipients.forEach((uid) => {
    const note = createNotification(state, {
      recipientUserId: uid,
      actorUserId: '',
      type: 'system_announcement',
      objectId: '',
      title,
      message,
      route: '#/notifications',
      metadata: { scope: targetUserId ? 'user' : 'global' },
      dedupeKey: 'system-announcement:' + (targetUserId || 'all') + ':' + title + ':' + message
    });
    if (note) created += 1;
  });
  saveState(state);
  res.json({ ok: true, created });
});

app.get('/search', (req, res) => {
  const state = ensureState();
  const result = runUnifiedSearch(state, req.userId || '', req.query || {});
  if (result.invalid) return res.status(400).json({ ok: false, error: result.reason || 'invalid query' });
  return res.json({ ok: true, ...result });
});

app.get('/search/suggestions', (req, res) => {
  const q = sanitizeText((req.query || {}).q || '', 120);
  if (!q) return res.json({ ok: true, q: '', suggestions: [] });
  const state = ensureState();
  const suggestions = buildSearchSuggestions(state, req.userId || '', q, Number((req.query || {}).limit || 8));
  return res.json({ ok: true, q, suggestions });
});

app.get('/analytics/recommendation', adminGuard, (req, res) => {
  const state = ensureState();
  const top = Object.values(state.smartReach.content || {})
    .map((meta) => ({
      contentId: meta.contentId,
      stage: meta.stage,
      score: Number(meta.lastScore || 0),
      impressions: Number((meta.metrics || {}).impressions || 0),
      views: Number((meta.metrics || {}).views || 0),
      watchTimeMs: Number((meta.metrics || {}).watchTimeMs || 0),
      likes: Number((meta.metrics || {}).likes || 0),
      comments: Number((meta.metrics || {}).comments || 0),
      shares: Number((meta.metrics || {}).shares || 0),
      saves: Number((meta.metrics || {}).saves || 0)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 100);
  res.json({ ok: true, recommendation: state.smartReach.analytics.recommendation, topContent: top });
});

app.get('/analytics/content/:id', requireAuth, (req, res) => {
  const state = ensureState();
  const contentId = String(req.params.id || '');
  const post = (state.creatorPosts || []).find((p) => String(p.id) === contentId);
  if (!post) return res.status(404).json({ error: 'content not found' });
  const isOwner = String(post.ownerUserId) === String(req.userId);
  const isAdmin = String(req.query.adminKey || req.headers['x-admin-key'] || '') === String(ADMIN_KEY);
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'forbidden' });
  const meta = state.smartReach.content[contentId] || { metrics: {}, stage: 'initial', lastScore: 0 };
  const m = meta.metrics || {};
  const impressions = Number(m.impressions || 0);
  const views = Number(m.views || 0);
  const engagementNumerator = Number(m.likes || 0) + Number(m.comments || 0) + Number(m.shares || 0) + Number(m.saves || 0);
  const engagementRate = views > 0 ? Number((engagementNumerator / views).toFixed(6)) : 0;
  res.json({
    ok: true,
    contentId,
    stage: meta.stage,
    recommendationScore: Number(meta.lastScore || 0),
    reach: {
      impressions,
      views,
      watchTimeMs: Number(m.watchTimeMs || 0),
      completionRate: views > 0 ? Number((Number(m.completions || 0) / views).toFixed(6)) : 0,
      engagementRate,
      shares: Number(m.shares || 0),
      saves: Number(m.saves || 0),
      profileVisits: Number(m.profileVisits || 0),
      notInterested: Number(m.notInterested || 0),
      reports: Number(m.reports || 0)
    }
  });
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
  res.json({ ok:true, service, connected:true, permissions: state.connects[userId][service].meta.permissions });
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
  res.json({ ok:true, service, connected:false });
});

// request withdrawal (simulate)
app.post('/creator/:id/withdraw', (req, res) => {
  const id = req.params.id; const body = req.body||{}; const amount = Number(body.amount||0);
  const state = ensureState(); state.creators = state.creators||{}; if (!state.creators[id]) state.creators[id] = { totalViews:0, earnings:0, availableBalance:0, withdrawals:[] };
  // enforce payout eligibility threshold (from persisted settings when available)
  const creatorViews = Number(state.creators[id].totalViews||0);
  const threshold = Number((state.settings && state.settings.payoutThreshold) || PAYOUT_VIEWS_THRESHOLD);
  if (creatorViews < threshold) return res.status(400).json({ error: `Withdrawal eligibility requires ${threshold} valid views. You have ${creatorViews}.` });
  const avail = Number(state.creators[id].availableBalance||0);
  if (amount <= 0 || amount > avail) return res.status(400).json({ error: 'invalid amount' });
  state.creators[id].availableBalance = +(avail - amount).toFixed(6);
  const w = { id: 'w-'+Date.now(), amount, requestedAt: new Date().toISOString(), status: 'pending' };
  state.creators[id].withdrawals.unshift(w);
  saveState(state);
  res.json({ ok:true, withdrawal: w });
});

// start
async function startServer() {
  smartReachDb = await createSmartReachDbStore({
    dbPath: SMART_REACH_DB_FILE,
    migrationsDir: path.join(__dirname, 'migrations')
  });
  app.listen(PORT, ()=>{ console.log('AFRIQORA monetization server listening on port', PORT); ensureState(); });
}

startServer().catch((err) => {
  console.error('Failed to start AFRIQORA server', err);
  process.exit(1);
});
