import type { RedditPost } from "../types";
import { extractCandidateTickers } from "./message";

const PROJECT_PREFIX = "reddit-stocks-digest-worker";

export function buildDetailedReport(
  analysis: string,
  posts: RedditPost[],
  aiAnalysis: boolean,
  now = new Date(),
): string {
  const lines: string[] = [
    "# Reddit Stocks Digest 详细报告",
    "",
    `- 生成时间: ${now.toISOString()}`,
    `- 热门帖子数量: ${posts.length}`,
    `- AI 摘要: ${aiAnalysis ? "是" : "否（使用回退摘要）"}`,
  ];

  const tickers = extractCandidateTickers(posts);
  if (tickers.length > 0) {
    lines.push(`- 关注代码: ${tickers.join(", ")}`);
  }

  lines.push("", "## 摘要", "", analysis, "", "## 热门帖子明细", "");

  posts.forEach((post, index) => {
    const flair = post.linkFlairText ? ` [${post.linkFlairText}]` : "";
    lines.push(`### ${index + 1}. ${post.title}${flair}`);
    lines.push(`- Score: ${post.score}`);
    lines.push(`- Comments: ${post.numComments}`);
    lines.push(`- Author: ${post.author}`);
    lines.push(`- URL: https://www.reddit.com${post.permalink}`);
    if (post.selftext.trim()) {
      lines.push("- 摘要片段:", post.selftext.trim().slice(0, 800));
    }
    lines.push("");
  });

  return `${lines.join("\n").trim()}\n`;
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
  return `${PROJECT_PREFIX}/${stamp}.md`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
