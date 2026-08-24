CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS smartreach_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  state_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS smartreach_contents (
  content_id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  owner_afriqora_id TEXT,
  content_type TEXT,
  category TEXT,
  location TEXT,
  published_at TEXT,
  stage TEXT,
  last_score REAL DEFAULT 0,
  repeated_by_author INTEGER DEFAULT 0,
  video_prepared INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  watch_time_ms INTEGER DEFAULT 0,
  completions INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  profile_visits INTEGER DEFAULT 0,
  follows_generated INTEGER DEFAULT 0,
  not_interested INTEGER DEFAULT 0,
  skips INTEGER DEFAULT 0,
  reports INTEGER DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS smartreach_content_topics (
  content_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  PRIMARY KEY (content_id, topic),
  FOREIGN KEY (content_id) REFERENCES smartreach_contents(content_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS smartreach_user_profiles (
  user_id TEXT PRIMARY KEY,
  location TEXT,
  interactions INTEGER DEFAULT 0,
  negatives INTEGER DEFAULT 0,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS smartreach_user_interests (
  user_id TEXT NOT NULL,
  interest TEXT NOT NULL,
  score REAL DEFAULT 0,
  PRIMARY KEY (user_id, interest),
  FOREIGN KEY (user_id) REFERENCES smartreach_user_profiles(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS smartreach_feed_items (
  user_id TEXT NOT NULL,
  feed_key TEXT NOT NULL,
  position INTEGER NOT NULL,
  content_id TEXT NOT NULL,
  inserted_at TEXT NOT NULL,
  PRIMARY KEY (user_id, feed_key, content_id)
);

CREATE TABLE IF NOT EXISTS smartreach_not_interested (
  user_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, content_id)
);

CREATE TABLE IF NOT EXISTS smartreach_blocked_users (
  user_id TEXT NOT NULL,
  blocked_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, blocked_user_id)
);

CREATE TABLE IF NOT EXISTS smartreach_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS smartreach_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  source TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS smartreach_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_smartreach_contents_owner ON smartreach_contents(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_smartreach_contents_category ON smartreach_contents(category);
CREATE INDEX IF NOT EXISTS idx_smartreach_contents_location ON smartreach_contents(location);
CREATE INDEX IF NOT EXISTS idx_smartreach_contents_stage_score ON smartreach_contents(stage, last_score DESC);
CREATE INDEX IF NOT EXISTS idx_smartreach_topics_topic ON smartreach_content_topics(topic);
CREATE INDEX IF NOT EXISTS idx_smartreach_feed_user_feed_position ON smartreach_feed_items(user_id, feed_key, position);
CREATE INDEX IF NOT EXISTS idx_smartreach_events_content_time ON smartreach_events(content_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_smartreach_events_user_time ON smartreach_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_smartreach_not_interested_user ON smartreach_not_interested(user_id);
CREATE INDEX IF NOT EXISTS idx_smartreach_blocked_users_user ON smartreach_blocked_users(user_id);
CREATE INDEX IF NOT EXISTS idx_smartreach_reports_content ON smartreach_reports(content_id, created_at DESC);
