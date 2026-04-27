import type { RedditPost, RuntimeState } from "../types";
const MAX_MESSAGE_LENGTH = 4000;
const TICKER_STOPWORDS = new Set([
  "A", "AI", "ALL", "AMDY", "CEO", "CPI", "DD", "DJT", "EDIT", "EPS", "ETF", "EV", "FDA", "FOMO",
  "GDP", "HOT", "HODL", "IPO", "IT", "LLM", "LONG", "LOL", "MOON", "NOW", "PUT", "Q1", "Q2", "Q3",
  "Q4", "SEC", "SPY", "TLDR", "USA", "USD", "UTC", "YOY",
  "CNBC", "CPU", "RAM", "VIDIA", "TESLA", "GOOGLE", "SPACE", "SPACEX", "TRUMP", "INTEL",
]);

export function buildDigestMessage(analysis: string, posts: RedditPost[], detailedReportUrl = "", now = new Date(), modelLabel = ""): string {
  const modelLine = modelLabel ? `🤖 模型：${modelLabel}` : "";
  const tickerLine = buildTickerLine(posts);
  const reportLine = detailedReportUrl ? `详细版报告:\n${detailedReportUrl}` : "";
  const parts = [modelLine, tickerLine, "─".repeat(20), analysis, reportLine].filter(Boolean);
  const body = parts.join("\n\n");
  return body.slice(0, MAX_MESSAGE_LENGTH);
}

export function buildFallbackMessage(posts: RedditPost[], detailedReportUrl = "", now = new Date(), modelLabel = ""): string {
  const header = "⚠️ AI 分析不可用，以下为原始热门帖子列表\n";
  const modelLine = modelLabel ? `🤖 模型：${modelLabel}` : "";
  const tickerLine = buildTickerLine(posts);
  const lines: string[] = [header];
  if (modelLine) lines.push(modelLine);
  if (tickerLine) lines.push(tickerLine);

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const flair = post.linkFlairText ? ` [${post.linkFlairText}]` : "";
    const line = `${i + 1}. [⬆️ ${formatNumber(post.score)} | 💬 ${post.numComments}]${flair} ${post.title}`;
    const candidate = lines.join("\n") + "\n" + line;
    if (candidate.length > MAX_MESSAGE_LENGTH) {
      lines.push(`\n... 共 ${posts.length} 条，已截断`);
      break;
    }
    lines.push(line);
  }

  if (detailedReportUrl) {
    lines.push("", `详细版报告:\n${detailedReportUrl}`);
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

function buildTickerLine(posts: RedditPost[]): string {
  const tickers = extractCandidateTickers(posts);
  return tickers.length > 0 ? `🎯 关注代码：${tickers.join(", ")}` : "";
}

export function extractCandidateTickers(posts: RedditPost[]): string[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    const text = `${post.title}\n${post.selftext}`;
    for (const match of text.matchAll(/(?:\$([A-Z]{1,5})\b)|(?:\(([A-Z]{1,5})\))/g)) {
      const ticker = match[1] || match[2];
      if (!ticker || ticker.length < 2 || TICKER_STOPWORDS.has(ticker)) continue;
      counts.set(ticker, (counts.get(ticker) ?? 0) + 2);
    }

    for (const match of text.matchAll(/\$?([A-Z]{2,5})\b/g)) {
      const ticker = match[1];
      if (!ticker || ticker.length < 2 || TICKER_STOPWORDS.has(ticker)) continue;
      counts.set(ticker, (counts.get(ticker) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([ticker]) => ticker);
}
