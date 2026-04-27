import { parseConfig } from "./config";
import { insertDigestSummary, markDigestSummaryPushed } from "./db";
import {
  getRuntimeState,
  recordFailure,
  recordSuccess,
  setRuntimeState,
  shouldSendFailureAlert,
  shouldSendHeartbeat,
} from "./lib/runtime";
import { fetchHotPosts } from "./services/reddit";
import { analyzeWithLLM } from "./services/llm";
import { pushToFeishu } from "./services/feishu";
import { uploadDetailedReportToCos } from "./services/cos";
import { buildDigestMessage, buildFailureAlertMessage, buildFallbackMessage, buildHeartbeatMessage } from "./lib/message";
import { buildDetailedReport } from "./lib/report";
import { buildDetailedReportPublicUrl, maybeHandleDetailedReportRequest, saveDetailedReportCopy } from "./lib/report-storage";
import { authorizeAdminRequest } from "./lib/admin";
import type { DigestConfig, Env, RedditPost, RuntimeState } from "./types";

async function runDigest(env: Env): Promise<{ postCount: number; aiAnalysis: boolean; detailedReportUrl?: string }> {
  const config = parseConfig(env);
  const state = await getRuntimeState(env.HEARTBEAT_KV);
  const now = new Date();

  try {
    const digest = await buildDigest(config, env.AI);
    const detailedReport = buildDetailedReport(
      digest.analysis ?? digest.fallbackMessage,
      digest.posts,
      digest.aiAnalysis,
      now,
    );
    const uploadedReport = await uploadDetailedReportToCos(config, detailedReport, now);
    await saveDetailedReportCopy(env.HEARTBEAT_KV, uploadedReport.key, detailedReport);
    const publicReportUrl = buildDetailedReportPublicUrl(config.workerPublicBaseUrl, uploadedReport.key);
    const baseMessage = digest.aiAnalysis
      ? buildDigestMessage(digest.analysis ?? "", digest.posts, publicReportUrl, now, digest.modelLabel ?? "")
      : buildFallbackMessage(digest.posts, publicReportUrl, now, digest.modelLabel ?? "");
    const message = baseMessage;

    const summaryId = crypto.randomUUID();
    await insertDigestSummary(env.SUMMARIES_DB, {
      id: summaryId,
      postCount: digest.posts.length,
      aiAnalysis: digest.aiAnalysis,
      messageText: message,
      analysisText: digest.analysis,
      posts: digest.posts,
      now,
    });

    let nextState = recordSuccess(state, now);

    try {
      await pushToFeishu(config, message);
      await markDigestSummaryPushed(env.SUMMARIES_DB, summaryId, true);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await markDigestSummaryPushed(env.SUMMARIES_DB, summaryId, false, msg);
      throw error;
    }

    if (shouldSendHeartbeat(nextState, config.heartbeatIntervalHours, now)) {
      try {
        await pushToFeishu(config, buildHeartbeatMessage(nextState, config.heartbeatIntervalHours));
        nextState = { ...nextState, lastHeartbeatAt: now.toISOString() };
      } catch {
        // Heartbeat should not fail the main digest flow.
      }
    }
    await setRuntimeState(env.HEARTBEAT_KV, nextState);
    return { postCount: digest.posts.length, aiAnalysis: digest.aiAnalysis, detailedReportUrl: publicReportUrl };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    let nextState = recordFailure(state, msg, now);
    if (shouldSendFailureAlert(nextState, config.failureAlertThreshold, config.failureAlertCooldownMinutes, now)) {
      try {
        await pushToFeishu(config, buildFailureAlertMessage(nextState, config.failureAlertThreshold));
        nextState = { ...nextState, lastAlertAt: now.toISOString() };
      } catch {
        // Keep the original failure as the primary signal.
      }
    }
    await setRuntimeState(env.HEARTBEAT_KV, nextState);
    throw error;
  }
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return Response.json(data, { status });
}

export function queueManualTrigger(ctx: ExecutionContext, task: () => Promise<unknown>): Response {
  ctx.waitUntil(task());
  return jsonResponse({ ok: true, queued: true }, 202);
}

async function buildDigest(config: DigestConfig, ai: Ai): Promise<{
  posts: RedditPost[];
  analysis?: string;
  modelLabel?: string;
  aiAnalysis: boolean;
  fallbackMessage: string;
}> {
  const posts = await fetchHotPosts(config.postLimit, config.requestTimeoutMs, config.redditCookie);

  try {
    const llmResult = await analyzeWithLLM(config, ai, posts);
    return {
      posts,
      analysis: llmResult.analysis,
      modelLabel: llmResult.modelLabel,
      aiAnalysis: true,
      fallbackMessage: buildFallbackMessage(posts),
    };
  } catch (error) {
    console.error("LLM analysis failed", error instanceof Error ? error.message : String(error));
    return {
      posts,
      aiAnalysis: false,
      fallbackMessage: buildFallbackMessage(posts),
    };
  }
}

async function buildHealthResponse(env: Env): Promise<Record<string, unknown>> {
  const runtimeState: RuntimeState = await getRuntimeState(env.HEARTBEAT_KV);
  return { ok: true, worker: "reddit-stocks-digest-worker", runtimeState };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET") {
      const reportResponse = await maybeHandleDetailedReportRequest(request, env.HEARTBEAT_KV);
      if (reportResponse) return reportResponse;
    }

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return jsonResponse(await buildHealthResponse(env));
    }

    if (request.method === "POST" && url.pathname === "/admin/trigger") {
      const config = parseConfig(env);
      const auth = authorizeAdminRequest(request, config.manualTriggerToken);
      if (!auth.ok) {
        return jsonResponse({ ok: false, error: auth.error }, auth.status);
      }
      if (url.searchParams.get("async") === "1") {
        return queueManualTrigger(ctx, async () => {
          await runDigest(env);
        });
      }
      try {
        const result = await runDigest(env);
        return jsonResponse({ ok: true, ...result });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return jsonResponse({ ok: false, error: msg }, 500);
      }
    }

    return jsonResponse({ ok: false, error: "not found" }, 404);
  },

  async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    await runDigest(env);
  },
};
