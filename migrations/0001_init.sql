CREATE TABLE IF NOT EXISTS digest_summaries (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  post_count INTEGER NOT NULL,
  ai_analysis INTEGER NOT NULL,
  message_text TEXT NOT NULL,
  analysis_text TEXT,
  top_posts_json TEXT NOT NULL,
  feishu_push_ok INTEGER NOT NULL DEFAULT 0,
  push_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_digest_summaries_created_at
  ON digest_summaries(created_at DESC);
