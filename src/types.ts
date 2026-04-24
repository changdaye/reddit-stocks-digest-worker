export interface Env {
  AI: Ai;
  HEARTBEAT_KV: KVNamespace;
  SUMMARIES_DB: D1Database;
  FEISHU_WEBHOOK: string;
  FEISHU_SECRET?: string;
  MANUAL_TRIGGER_TOKEN?: string;
  POST_LIMIT?: string;
  REQUEST_TIMEOUT_MS?: string;
  LLM_MODEL?: string;
  REDDIT_COOKIE?: string;
  HEARTBEAT_INTERVAL_HOURS?: string;
  FAILURE_ALERT_THRESHOLD?: string;
  FAILURE_ALERT_COOLDOWN_MINUTES?: string;
}

export interface DigestConfig {
  feishuWebhook: string;
  feishuSecret: string;
  postLimit: number;
  requestTimeoutMs: number;
  manualTriggerToken: string;
  llmModel: string;
  redditCookie: string;
  heartbeatIntervalHours: number;
  failureAlertThreshold: number;
  failureAlertCooldownMinutes: number;
}

export interface RedditPost {
  title: string;
  author: string;
  score: number;
  numComments: number;
  permalink: string;
  createdUtc: number;
  upvoteRatio: number;
  linkFlairText: string;
  selftext: string;
  stickied: boolean;
  url: string;
}

export interface RuntimeState {
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastHeartbeatAt?: string;
  lastAlertAt?: string;
  lastError?: string;
  consecutiveFailures: number;
}

export interface DigestSummaryRecord {
  id: string;
  createdAt: string;
  postCount: number;
  aiAnalysis: boolean;
  messageText: string;
  analysisText?: string;
  topPostsJson: string;
  feishuPushOk: boolean;
  pushError?: string;
}
