import type { Env, DigestConfig } from "./types";
import { toInt } from "./lib/value";

export function parseConfig(env: Env): DigestConfig {
  if (!env.FEISHU_WEBHOOK) throw new Error("missing FEISHU_WEBHOOK");
  return {
    feishuWebhook: env.FEISHU_WEBHOOK.trim(),
    feishuSecret: env.FEISHU_SECRET?.trim() ?? "",
    postLimit: toInt(env.POST_LIMIT, 20, 1),
    requestTimeoutMs: toInt(env.REQUEST_TIMEOUT_MS, 15_000, 1000),
    manualTriggerToken: env.MANUAL_TRIGGER_TOKEN?.trim() ?? "",
    llmModel: env.LLM_MODEL?.trim() || "@cf/meta/llama-3.1-8b-instruct",
    redditCookie: env.REDDIT_COOKIE?.trim() ?? "",
    heartbeatIntervalHours: toInt(env.HEARTBEAT_INTERVAL_HOURS, 24, 1),
    failureAlertThreshold: toInt(env.FAILURE_ALERT_THRESHOLD, 1, 1),
    failureAlertCooldownMinutes: toInt(env.FAILURE_ALERT_COOLDOWN_MINUTES, 180, 1),
  };
}
