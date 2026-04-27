export interface Env {
  AI: Ai;
  HEARTBEAT_KV: KVNamespace;
  SUMMARIES_DB: D1Database;
  FEISHU_WEBHOOK: string;
  FEISHU_SECRET?: string;
  MANUAL_TRIGGER_TOKEN?: string;
  TENCENT_COS_SECRET_ID: string;
  TENCENT_COS_SECRET_KEY: string;
  TENCENT_COS_BUCKET: string;
  TENCENT_COS_REGION: string;
  TENCENT_COS_BASE_URL?: string;
  WORKER_PUBLIC_BASE_URL?: string;
  POST_LIMIT?: string;
  REQUEST_TIMEOUT_MS?: string;
  LLM_BASE_URL?: string;
  LLM_API_KEY?: string;
  LLM_MODEL?: string;
  REDDIT_COOKIE?: string;
  HEARTBEAT_INTERVAL_HOURS?: string;
  FAILURE_ALERT_THRESHOLD?: string;
  FAILURE_ALERT_COOLDOWN_MINUTES?: string;
  FINAL_SUMMARY_HOUR_LOCAL?: string;
  FINAL_SUMMARY_MINUTE_LOCAL?: string;
  FINAL_SUMMARY_LOOKBACK_HOURS?: string;
  MARKET_TIMEZONE?: string;
}

export interface DigestConfig {
  feishuWebhook: string;
  feishuSecret: string;
  postLimit: number;
  requestTimeoutMs: number;
  manualTriggerToken: string;
  cosSecretId: string;
  cosSecretKey: string;
  cosBucket: string;
  cosRegion: string;
  cosBaseUrl: string;
  workerPublicBaseUrl: string;
  llmBaseUrl: string;
  llmApiKey: string;
  llmModel: string;
  redditCookie: string;
  heartbeatIntervalHours: number;
  failureAlertThreshold: number;
  failureAlertCooldownMinutes: number;
  finalSummaryHourLocal: number;
  finalSummaryMinuteLocal: number;
  finalSummaryLookbackHours: number;
  marketTimezone: string;
}

export interface LLMAnalysisResult {
  analysis: string;
  modelLabel: string;
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
