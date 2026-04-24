import { describe, expect, it } from "vitest";
import { buildDetailedReport, buildDetailedReportObjectKey } from "../src/lib/report";
import type { RedditPost } from "../src/types";

const posts: RedditPost[] = [
  {
    title: "AAPL earnings beat expectations",
    author: "user1",
    score: 123,
    numComments: 45,
    permalink: "/r/stocks/comments/abc/aapl/",
    createdUtc: 1714000000,
    upvoteRatio: 0.95,
    linkFlairText: "Company News",
    selftext: "Revenue and EPS both came in above consensus.",
    stickied: false,
    url: "https://www.reddit.com/r/stocks/comments/abc/aapl/",
  },
];

describe("buildDetailedReport", () => {
  it("includes summary, ticker list and post metadata", () => {
    const report = buildDetailedReport("市场情绪偏多。", posts, true, new Date("2026-04-24T01:02:03Z"));
    expect(report).toContain("# Reddit Stocks Digest 详细报告");
    expect(report).toContain("关注代码: AAPL");
    expect(report).toContain("## 摘要");
    expect(report).toContain("市场情绪偏多。");
    expect(report).toContain("### 1. AAPL earnings beat expectations [Company News]");
    expect(report).toContain("https://www.reddit.com/r/stocks/comments/abc/aapl/");
  });
});

describe("buildDetailedReportObjectKey", () => {
  it("uses project prefix and UTC timestamp filename", () => {
    const key = buildDetailedReportObjectKey(new Date("2026-04-24T01:02:03Z"));
    expect(key).toBe("reddit-stocks-digest-worker/20260424010203.md");
  });
});
