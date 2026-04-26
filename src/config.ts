import type { Env, DigestConfig } from "./types";
import { toInt } from "./lib/value";

export function parseConfig(env: Env): DigestConfig {
  if (!env.FEISHU_WEBHOOK) throw new Error("missing FEISHU_WEBHOOK");
  if (!env.TENCENT_COS_SECRET_ID) throw new Error("missing TENCENT_COS_SECRET_ID");
  if (!env.TENCENT_COS_SECRET_KEY) throw new Error("missing TENCENT_COS_SECRET_KEY");
  if (!env.TENCENT_COS_BUCKET) throw new Error("missing TENCENT_COS_BUCKET");
  if (!env.TENCENT_COS_REGION) throw new Error("missing TENCENT_COS_REGION");
  return {
    feishuWebhook: env.FEISHU_WEBHOOK.trim(),
    feishuSecret: env.FEISHU_SECRET?.trim() ?? "",
    postLimit: toInt(env.POST_LIMIT, 20, 1),
    requestTimeoutMs: toInt(env.REQUEST_TIMEOUT_MS, 15_000, 1000),
    manualTriggerToken: env.MANUAL_TRIGGER_TOKEN?.trim() ?? "",
    cosSecretId: env.TENCENT_COS_SECRET_ID.trim(),
    cosSecretKey: env.TENCENT_COS_SECRET_KEY.trim(),
    cosBucket: env.TENCENT_COS_BUCKET.trim(),
    cosRegion: env.TENCENT_COS_REGION.trim(),
    cosBaseUrl: env.TENCENT_COS_BASE_URL?.trim() || `https://${env.TENCENT_COS_BUCKET.trim()}.cos.${env.TENCENT_COS_REGION.trim()}.myqcloud.com`,

    workerPublicBaseUrl: env.WORKER_PUBLIC_BASE_URL?.trim() || "https://reddit-stocks-digest-worker.5frhvfq5s2.workers.dev",
    llmBaseUrl: env.LLM_BASE_URL?.trim() ?? "",
    llmApiKey: env.LLM_API_KEY?.trim() ?? "",
    llmModel: env.LLM_MODEL?.trim() || "@cf/meta/llama-3.1-8b-instruct",
    redditCookie: env.REDDIT_COOKIE?.trim() ?? "",
    heartbeatIntervalHours: toInt(env.HEARTBEAT_INTERVAL_HOURS, 24, 1),
    failureAlertThreshold: toInt(env.FAILURE_ALERT_THRESHOLD, 1, 1),
    failureAlertCooldownMinutes: toInt(env.FAILURE_ALERT_COOLDOWN_MINUTES, 180, 1),
  };
}
