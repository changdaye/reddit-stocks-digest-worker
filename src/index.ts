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
import { buildDigestMessage, buildFailureAlertMessage, buildFallbackMessage, buildHeartbeatMessage } from "./lib/message";
import { authorizeAdminRequest } from "./lib/admin";
import type { DigestConfig, Env, RedditPost, RuntimeState } from "./types";

async function runDigest(env: Env): Promise<{ postCount: number; aiAnalysis: boolean }> {
  const config = parseConfig(env);
  const state = await getRuntimeState(env.HEARTBEAT_KV);
  const now = new Date();

  try {
    const digest = await buildDigest(config, env.AI);
    const summaryId = crypto.randomUUID();
    await insertDigestSummary(env.SUMMARIES_DB, {
      id: summaryId,
      postCount: digest.posts.length,
      aiAnalysis: digest.aiAnalysis,
      messageText: digest.message,
      analysisText: digest.analysis,
      posts: digest.posts,
      now,
    });

    try {
      await pushToFeishu(config, digest.message);
      await markDigestSummaryPushed(env.SUMMARIES_DB, summaryId, true);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await markDigestSummaryPushed(env.SUMMARIES_DB, summaryId, false, msg);
      throw error;
    }

    let nextState = recordSuccess(state, now);
    if (shouldSendHeartbeat(nextState, config.heartbeatIntervalHours, now)) {
      try {
        await pushToFeishu(config, buildHeartbeatMessage(nextState, config.heartbeatIntervalHours));
        nextState = { ...nextState, lastHeartbeatAt: now.toISOString() };
      } catch {
        // Heartbeat should not fail the main digest flow.
      }
    }
    await setRuntimeState(env.HEARTBEAT_KV, nextState);
    return { postCount: digest.posts.length, aiAnalysis: digest.aiAnalysis };
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

async function buildDigest(config: DigestConfig, ai: Ai): Promise<{
  posts: RedditPost[];
  message: string;
  analysis?: string;
  aiAnalysis: boolean;
}> {
  const posts = await fetchHotPosts(config.postLimit, config.requestTimeoutMs, config.redditCookie);

  try {
    const analysis = await analyzeWithLLM(config, ai, posts);
    return {
      posts,
      message: buildDigestMessage(analysis, posts),
      analysis,
      aiAnalysis: true,
    };
  } catch (error) {
    console.error("LLM analysis failed", error instanceof Error ? error.message : String(error));
    return {
      posts,
      message: buildFallbackMessage(posts),
      aiAnalysis: false,
    };
  }
}

async function buildHealthResponse(env: Env): Promise<Record<string, unknown>> {
  const runtimeState: RuntimeState = await getRuntimeState(env.HEARTBEAT_KV);
  return { ok: true, worker: "reddit-stocks-digest-worker", runtimeState };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return jsonResponse(await buildHealthResponse(env));
    }

    if (request.method === "POST" && url.pathname === "/admin/trigger") {
      const config = parseConfig(env);
      const auth = authorizeAdminRequest(request, config.manualTriggerToken);
      if (!auth.ok) {
        return jsonResponse({ ok: false, error: auth.error }, auth.status);
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
