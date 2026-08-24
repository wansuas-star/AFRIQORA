const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

function smartReachSkeleton(defaultConfig) {
  return {
    config: Object.assign({}, defaultConfig || {}),
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
      recommendation: {
        feedRequests: 0,
        feedServedItems: 0
      }
    }
  };
}

function normalizeSmartReachState(input, defaultConfig) {
  const base = smartReachSkeleton(defaultConfig);
  const src = (input && typeof input === 'object') ? input : {};
  base.config = Object.assign({}, base.config, src.config || {});
  base.content = src.content && typeof src.content === 'object' ? src.content : {};
  base.userFeeds = src.userFeeds && typeof src.userFeeds === 'object' ? src.userFeeds : {};
  base.userProfiles = src.userProfiles && typeof src.userProfiles === 'object' ? src.userProfiles : {};
  base.indexes = Object.assign({}, base.indexes, src.indexes || {});
  base.indexes.usersByInterest = base.indexes.usersByInterest || {};
  base.indexes.usersByLocation = base.indexes.usersByLocation || {};
  base.indexes.usersByCategoryEngagement = base.indexes.usersByCategoryEngagement || {};
  base.indexes.contentByCategory = base.indexes.contentByCategory || {};
  base.indexes.contentByLocation = base.indexes.contentByLocation || {};
  base.indexes.contentByAuthor = base.indexes.contentByAuthor || {};
  base.userActions = Object.assign({}, base.userActions, src.userActions || {});
  base.userActions.notInterested = base.userActions.notInterested || {};
  base.userActions.blockedUsers = base.userActions.blockedUsers || {};
  base.userActions.reportedContent = base.userActions.reportedContent || {};
  base.analytics = Object.assign({}, base.analytics, src.analytics || {});
  base.analytics.events = Array.isArray(base.analytics.events) ? base.analytics.events : [];
  base.analytics.recommendation = Object.assign({ feedRequests: 0, feedServedItems: 0 }, base.analytics.recommendation || {});
  return base;
}

function loadMigrationSql(migrationsDir) {
  if (!fs.existsSync(migrationsDir)) return [];
  return fs.readdirSync(migrationsDir)
    .filter((name) => name.toLowerCase().endsWith('.sql'))
    .sort()
    .map((name) => ({ id: name, sql: fs.readFileSync(path.join(migrationsDir, name), 'utf8') }));
}

function executePrepared(db, sql, rows) {
  const stmt = db.prepare(sql);
  try {
    (rows || []).forEach((params) => {
      stmt.bind(params || []);
      stmt.step();
      stmt.reset();
    });
  } finally {
    stmt.free();
  }
}

function queryAll(db, sql, params) {
  const stmt = db.prepare(sql);
  try {
    if (params) stmt.bind(params);
    const out = [];
    while (stmt.step()) out.push(stmt.getAsObject());
    return out;
  } finally {
    stmt.free();
  }
}

async function createSmartReachDbStore(options) {
  const dbPath = options && options.dbPath ? options.dbPath : path.join(__dirname, 'smartreach.db');
  const migrationsDir = options && options.migrationsDir ? options.migrationsDir : path.join(__dirname, 'migrations');

  const SQL = await initSqlJs({
    locateFile: (file) => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file)
  });

  let db;
  if (fs.existsSync(dbPath)) {
    const existing = fs.readFileSync(dbPath);
    db = new SQL.Database(existing);
  } else {
    db = new SQL.Database();
  }

  const migrations = loadMigrationSql(migrationsDir);
  db.run('CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  const appliedRows = queryAll(db, 'SELECT id FROM schema_migrations');
  const applied = new Set(appliedRows.map((row) => String(row.id)));
  const nowIso = () => new Date().toISOString();

  migrations.forEach((migration) => {
    if (applied.has(migration.id)) return;
    db.run('BEGIN');
    try {
      db.run(migration.sql);
      executePrepared(db, 'INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)', [[migration.id, nowIso()]]);
      db.run('COMMIT');
    } catch (e) {
      db.run('ROLLBACK');
      throw e;
    }
  });

  function flushDbFile() {
    const bytes = db.export();
    fs.writeFileSync(dbPath, Buffer.from(bytes));
  }

  function clearProjection() {
    db.run('DELETE FROM smartreach_contents');
    db.run('DELETE FROM smartreach_content_topics');
    db.run('DELETE FROM smartreach_user_profiles');
    db.run('DELETE FROM smartreach_user_interests');
    db.run('DELETE FROM smartreach_feed_items');
    db.run('DELETE FROM smartreach_not_interested');
    db.run('DELETE FROM smartreach_blocked_users');
    db.run('DELETE FROM smartreach_reports');
    db.run('DELETE FROM smartreach_events');
    db.run('DELETE FROM smartreach_config');
  }

  function persistProjection(smartReachState) {
    clearProjection();
    const stamp = nowIso();

    const contentRows = [];
    const topicRows = [];
    Object.entries(smartReachState.content || {}).forEach(([contentId, meta]) => {
      const metrics = (meta && meta.metrics) || {};
      contentRows.push([
        String(contentId),
        String((meta && meta.ownerUserId) || ''),
        String((meta && meta.ownerAfriqoraId) || ''),
        String((meta && meta.contentType) || ''),
        String((meta && meta.category) || ''),
        String((meta && meta.location) || ''),
        String((meta && meta.publishedAt) || ''),
        String((meta && meta.stage) || 'initial'),
        Number((meta && meta.lastScore) || 0),
        (meta && meta.repeatedByAuthor) ? 1 : 0,
        (meta && meta.videoPrepared) ? 1 : 0,
        Number(metrics.impressions || 0),
        Number(metrics.views || 0),
        Number(metrics.watchTimeMs || 0),
        Number(metrics.completions || 0),
        Number(metrics.likes || 0),
        Number(metrics.comments || 0),
        Number(metrics.shares || 0),
        Number(metrics.saves || 0),
        Number(metrics.profileVisits || 0),
        Number(metrics.followsGenerated || 0),
        Number(metrics.notInterested || 0),
        Number(metrics.skips || 0),
        Number(metrics.reports || 0),
        stamp
      ]);
      const topics = Array.isArray(meta && meta.topics) ? meta.topics : [];
      topics.forEach((topic) => topicRows.push([String(contentId), String(topic)]));
    });
    executePrepared(db, `
      INSERT INTO smartreach_contents (
        content_id, owner_user_id, owner_afriqora_id, content_type, category, location, published_at,
        stage, last_score, repeated_by_author, video_prepared,
        impressions, views, watch_time_ms, completions, likes, comments, shares, saves,
        profile_visits, follows_generated, not_interested, skips, reports, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, contentRows);
    executePrepared(db, 'INSERT OR IGNORE INTO smartreach_content_topics (content_id, topic) VALUES (?, ?)', topicRows);

    const profileRows = [];
    const interestRows = [];
    Object.entries(smartReachState.userProfiles || {}).forEach(([userId, profile]) => {
      profileRows.push([
        String(userId),
        String((profile && profile.location) || ''),
        Number((profile && profile.interactions) || 0),
        Number((profile && profile.negatives) || 0),
        String((profile && profile.updatedAt) || stamp)
      ]);
      const interests = (profile && profile.interests && typeof profile.interests === 'object') ? profile.interests : {};
      Object.entries(interests).forEach(([interest, score]) => {
        interestRows.push([String(userId), String(interest), Number(score || 0)]);
      });
    });
    executePrepared(db, 'INSERT OR REPLACE INTO smartreach_user_profiles (user_id, location, interactions, negatives, updated_at) VALUES (?, ?, ?, ?, ?)', profileRows);
    executePrepared(db, 'INSERT OR REPLACE INTO smartreach_user_interests (user_id, interest, score) VALUES (?, ?, ?)', interestRows);

    const feedRows = [];
    Object.entries(smartReachState.userFeeds || {}).forEach(([userId, feeds]) => {
      Object.entries(feeds || {}).forEach(([feedKey, ids]) => {
        (Array.isArray(ids) ? ids : []).forEach((contentId, idx) => {
          feedRows.push([String(userId), String(feedKey), idx, String(contentId), stamp]);
        });
      });
    });
    executePrepared(db, 'INSERT OR REPLACE INTO smartreach_feed_items (user_id, feed_key, position, content_id, inserted_at) VALUES (?, ?, ?, ?, ?)', feedRows);

    const niRows = [];
    Object.entries((smartReachState.userActions || {}).notInterested || {}).forEach(([userId, records]) => {
      Object.entries(records || {}).forEach(([contentId, ts]) => {
        niRows.push([String(userId), String(contentId), new Date(Number(ts) || Date.now()).toISOString()]);
      });
    });
    executePrepared(db, 'INSERT OR REPLACE INTO smartreach_not_interested (user_id, content_id, created_at) VALUES (?, ?, ?)', niRows);

    const blockedRows = [];
    Object.entries((smartReachState.userActions || {}).blockedUsers || {}).forEach(([userId, records]) => {
      Object.entries(records || {}).forEach(([blockedUserId, ts]) => {
        blockedRows.push([String(userId), String(blockedUserId), new Date(Number(ts) || Date.now()).toISOString()]);
      });
    });
    executePrepared(db, 'INSERT OR REPLACE INTO smartreach_blocked_users (user_id, blocked_user_id, created_at) VALUES (?, ?, ?)', blockedRows);

    const reportRows = [];
    Object.entries((smartReachState.userActions || {}).reportedContent || {}).forEach(([userId, records]) => {
      (Array.isArray(records) ? records : []).forEach((row) => {
        reportRows.push([String(userId), String((row && row.contentId) || ''), String((row && row.reason) || ''), String((row && row.createdAt) || stamp)]);
      });
    });
    executePrepared(db, 'INSERT INTO smartreach_reports (user_id, content_id, reason, created_at) VALUES (?, ?, ?, ?)', reportRows);

    const eventRows = [];
    ((((smartReachState.analytics || {}).events) || []).slice(-2000)).forEach((event) => {
      eventRows.push([
        String((event && event.contentId) || ''),
        String((event && event.userId) || ''),
        String((event && event.eventType) || ''),
        String((event && event.source) || ''),
        String((event && event.createdAt) || stamp)
      ]);
    });
    executePrepared(db, 'INSERT INTO smartreach_events (content_id, user_id, event_type, source, created_at) VALUES (?, ?, ?, ?, ?)', eventRows);

    const configRows = [];
    Object.entries(smartReachState.config || {}).forEach(([key, value]) => {
      configRows.push([String(key), JSON.stringify(value), stamp]);
    });
    executePrepared(db, 'INSERT OR REPLACE INTO smartreach_config (key, value, updated_at) VALUES (?, ?, ?)', configRows);
  }

  function loadState(defaultConfig, legacyState) {
    const rows = queryAll(db, 'SELECT state_json FROM smartreach_state WHERE id = 1 LIMIT 1');
    if (rows.length && rows[0].state_json) {
      try {
        const parsed = JSON.parse(String(rows[0].state_json));
        return normalizeSmartReachState(parsed, defaultConfig);
      } catch (e) {}
    }
    const normalized = normalizeSmartReachState(legacyState || null, defaultConfig);
    saveState(normalized);
    return normalized;
  }

  function saveState(smartReachState) {
    const normalized = normalizeSmartReachState(smartReachState, (smartReachState && smartReachState.config) || {});
    const raw = JSON.stringify(normalized);
    const stamp = nowIso();
    executePrepared(db, 'INSERT INTO smartreach_state (id, state_json, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at', [[raw, stamp]]);
    persistProjection(normalized);
    flushDbFile();
    return normalized;
  }

  return {
    loadState,
    saveState,
    dbPath
  };
}

module.exports = {
  createSmartReachDbStore,
  normalizeSmartReachState,
  smartReachSkeleton
};
