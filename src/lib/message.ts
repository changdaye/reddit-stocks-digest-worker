import type { RedditPost, RuntimeState } from "../types";

const REDDIT_BASE = "https://www.reddit.com";
const MAX_MESSAGE_LENGTH = 4000;

export function buildDigestMessage(analysis: string, posts: RedditPost[], now = new Date()): string {
  const timestamp = now.toISOString().replace("T", " ").slice(0, 16);
  const header = `📊 Reddit r/stocks 财经日报 (${timestamp} UTC)`;
  const divider = "─".repeat(20);

  let message = `${header}\n${divider}\n\n${analysis}`;

  const topLinks = posts.slice(0, 5);
  if (topLinks.length > 0) {
    message += `\n\n${divider}\n🔗 热门原帖链接：\n`;
    for (const post of topLinks) {
      const line = `• ${post.title.slice(0, 60)}${post.title.length > 60 ? "..." : ""}\n  ${REDDIT_BASE}${post.permalink}\n`;
      if (message.length + line.length > MAX_MESSAGE_LENGTH) break;
      message += line;
    }
  }

  return message;
}

export function buildFallbackMessage(posts: RedditPost[], now = new Date()): string {
  const timestamp = now.toISOString().replace("T", " ").slice(0, 16);
  const header = `📊 Reddit r/stocks 热门帖子 (${timestamp} UTC)\n⚠️ AI 分析不可用，以下为原始热门帖子列表\n`;
  const lines: string[] = [header];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const flair = post.linkFlairText ? ` [${post.linkFlairText}]` : "";
    const line = `${i + 1}. [⬆️ ${formatNumber(post.score)} | 💬 ${post.numComments}]${flair} ${post.title}\n   🔗 ${REDDIT_BASE}${post.permalink}`;
    const candidate = lines.join("\n") + "\n" + line;
    if (candidate.length > MAX_MESSAGE_LENGTH) {
      lines.push(`\n... 共 ${posts.length} 条，已截断`);
      break;
    }
    lines.push(line);
  }

  lines.push(`\n共 ${posts.length} 条热门帖子`);
  return lines.join("\n");
}

export function buildHeartbeatMessage(state: RuntimeState, intervalHours: number): string {
  const lines = ["💓 Reddit stocks digest 心跳"];
  if (state.lastSuccessAt) lines.push(`上次成功: ${state.lastSuccessAt}`);
  lines.push(`心跳间隔: ${intervalHours}h`);
  lines.push(`连续失败: ${state.consecutiveFailures}`);
  if (state.lastError) lines.push(`最近错误: ${state.lastError}`);
  return lines.join("\n");
}

export function buildFailureAlertMessage(state: RuntimeState, threshold: number): string {
  return [
    "🚨 Reddit stocks digest 异常告警",
    `连续失败: ${state.consecutiveFailures}`,
    `告警阈值: ${threshold}`,
    `上次成功: ${state.lastSuccessAt ?? "无"}`,
    `最近错误: ${state.lastError ?? "unknown"}`,
  ].join("\n");
}

function formatNumber(n: number): string {
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 1_000) return new Intl.NumberFormat("en-US").format(n);
  return String(n);
}
