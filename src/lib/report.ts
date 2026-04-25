import type { RedditPost } from "../types";
import { extractCandidateTickers } from "./message";

const PROJECT_PREFIX = "reddit-stocks-digest-worker";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMultilineText(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

export function buildDetailedReport(
  analysis: string,
  posts: RedditPost[],
  aiAnalysis: boolean,
  now = new Date(),
): string {
  const tickers = extractCandidateTickers(posts);
  const detailCards = posts.map((post, index) => {
    const flair = post.linkFlairText ? ` [${post.linkFlairText}]` : "";
    const url = `https://www.reddit.com${post.permalink}`;
    return `
      <article class="item-card">
        <h3>${index + 1}. ${escapeHtml(`${post.title}${flair}`)}</h3>
        <dl>
          <div><dt>Score</dt><dd>${post.score}</dd></div>
          <div><dt>Comments</dt><dd>${post.numComments}</dd></div>
          <div><dt>Author</dt><dd>${escapeHtml(post.author)}</dd></div>
          <div><dt>URL</dt><dd><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></dd></div>
          ${post.selftext.trim() ? `<div><dt>摘要片段</dt><dd>${formatMultilineText(post.selftext.trim().slice(0, 800))}</dd></div>` : ""}
        </dl>
      </article>`;
  }).join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Reddit Stocks Digest 详细报告</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif; margin: 0; background: #f5f7fb; color: #111827; }
    .wrap { max-width: 980px; margin: 0 auto; padding: 32px 20px 48px; }
    .card { background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); margin-bottom: 20px; }
    h1, h2, h3 { margin-top: 0; }
    .meta { color: #64748b; line-height: 1.9; }
    .summary { line-height: 1.8; font-size: 16px; }
    .item-card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; margin-top: 16px; }
    dl { margin: 0; display: grid; gap: 10px; }
    dt { font-weight: 700; }
    dd { margin: 4px 0 0; color: #334155; line-height: 1.8; }
    a { color: #2563eb; word-break: break-all; }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="card">
      <h1>Reddit Stocks Digest 详细报告</h1>
      <div class="meta">
        <div><strong>生成时间：</strong>${escapeHtml(now.toISOString())}</div>
        <div><strong>热门帖子数量：</strong>${posts.length}</div>
        <div><strong>AI 摘要：</strong>${aiAnalysis ? "是" : "否（使用回退摘要）"}</div>
        ${tickers.length > 0 ? `<div><strong>关注代码：</strong>${escapeHtml(tickers.join(", "))}</div>` : ""}
      </div>
    </section>

    <section class="card">
      <h2>摘要</h2>
      <div class="summary">${formatMultilineText(analysis)}</div>
    </section>

    <section class="card">
      <h2>热门帖子明细</h2>
      ${detailCards || "<p>本轮没有可展示的帖子。</p>"}
    </section>
  </div>
</body>
</html>
`;
}

export function buildDetailedReportObjectKey(now = new Date()): string {
  const stamp = [
    now.getUTCFullYear(),
    pad(now.getUTCMonth() + 1),
    pad(now.getUTCDate()),
    pad(now.getUTCHours()),
    pad(now.getUTCMinutes()),
    pad(now.getUTCSeconds()),
  ].join("");
  return `${PROJECT_PREFIX}/${stamp}.html`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
