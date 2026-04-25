import { describe, expect, it } from "vitest";
import { buildDigestMessage, buildFallbackMessage } from "../src/lib/message";
import type { RedditPost } from "../src/types";

function makePost(overrides: Partial<RedditPost> = {}): RedditPost {
  return {
    title: "Test Post Title",
    author: "testuser",
    score: 100,
    numComments: 50,
    permalink: "/r/stocks/comments/abc123/test_post/",
    createdUtc: 1714000000,
    upvoteRatio: 0.95,
    linkFlairText: "",
    selftext: "",
    stickied: false,
    url: "https://reddit.com/r/stocks/comments/abc123/test_post/",
    ...overrides,
  };
}

describe("buildDigestMessage", () => {
  it("includes a readable model label when provided", () => {
    const posts = [makePost({ title: "AAPL earnings beat" })];
    const result = buildDigestMessage("测试摘要", posts, "", new Date("2026-04-23T06:00:00Z"), "GPT 5.4");
    expect(result).toContain("🤖 模型：GPT 5.4");
  });

  it("formats AI digest header and analysis without timestamp", () => {
    const posts = [makePost({ title: "AAPL earnings beat" })];
    const result = buildDigestMessage("市场情绪偏多，科技股讨论热度较高。", posts, "", new Date("2026-04-23T06:00:00Z"));
    expect(result).not.toContain("2026-04-23 06:00 UTC");
    expect(result).toContain("市场情绪偏多，科技股讨论热度较高。");
  });

  it("does not include source links", () => {
    const posts = [makePost({ permalink: "/r/stocks/comments/1/post_1/" })];
    const result = buildDigestMessage("今日重点如下", posts);
    expect(result).not.toContain("/r/stocks/comments/1/post_1/");
    expect(result).not.toContain("热门原帖链接");
  });

  it("lists extracted stock tickers when present", () => {
    const posts = [makePost({ title: "AAPL rises while TSLA slips", selftext: "MSFT remains stable" })];
    const result = buildDigestMessage("测试摘要", posts);
    expect(result).toContain("关注代码：AAPL, MSFT, TSLA");
  });

  it("filters noisy uppercase words from ticker extraction", () => {
    const posts = [makePost({ title: "CNBC says NVIDIA and CPU demand are hot while AMD rallies", selftext: "GOOGL and NVDA are the actual tickers" })];
    const result = buildDigestMessage("测试摘要", posts);
    expect(result).toContain("关注代码：AMD, GOOGL, NVDA");
    expect(result).not.toContain("CNBC");
    expect(result).not.toContain("CPU");
    expect(result).not.toContain("VIDIA");
  });

  it("formats detailed report link on its own line", () => {
    const posts = [makePost({ title: "AAPL earnings beat" })];
    const result = buildDigestMessage("测试摘要", posts, "https://example.com/reddit-stocks-digest-worker/20260424015246.md");
    expect(result).toContain(`详细版报告:
https://example.com/reddit-stocks-digest-worker/20260424015246.md`);
  });
});

describe("buildFallbackMessage", () => {
  it("includes a readable model label when provided", () => {
    const posts = [makePost({ title: "AAPL earnings beat", score: 1234, numComments: 567 })];
    const result = buildFallbackMessage(posts, "", new Date("2026-04-23T06:00:00Z"), "Llama 3.1 8B Instruct");
    expect(result).toContain("🤖 模型：Llama 3.1 8B Instruct");
  });

  it("formats posts with score and comments without timestamp", () => {
    const posts = [makePost({ title: "AAPL earnings beat", score: 1234, numComments: 567 })];
    const result = buildFallbackMessage(posts, "", new Date("2026-04-23T06:00:00Z"));
    expect(result).toContain("AI 分析不可用");
    expect(result).not.toContain("2026-04-23 06:00 UTC");
    expect(result).toContain("1,234");
    expect(result).toContain("567");
    expect(result).toContain("AAPL earnings beat");
  });

  it("includes flair when present", () => {
    const posts = [makePost({ linkFlairText: "Company News" })];
    const result = buildFallbackMessage(posts);
    expect(result).toContain("[Company News]");
  });

  it("abbreviates scores over 10k", () => {
    const posts = [makePost({ score: 15600 })];
    const result = buildFallbackMessage(posts);
    expect(result).toContain("15.6k");
  });

  it("numbers posts sequentially", () => {
    const posts = [makePost({ title: "First" }), makePost({ title: "Second" })];
    const result = buildFallbackMessage(posts);
    expect(result).toContain("1.");
    expect(result).toContain("2.");
    expect(result).toContain("First");
    expect(result).toContain("Second");
  });

  it("shows total count in footer", () => {
    const posts = [makePost()];
    const result = buildFallbackMessage(posts);
    expect(result).toContain("共 1 条热门帖子");
  });

  it("handles empty posts array", () => {
    const result = buildFallbackMessage([]);
    expect(result).toContain("共 0 条热门帖子");
  });

  it("does not include permalink links", () => {
    const posts = [makePost({ permalink: "/r/stocks/comments/xyz/my_post/" })];
    const result = buildFallbackMessage(posts);
    expect(result).not.toContain("https://www.reddit.com/r/stocks/comments/xyz/my_post/");
    expect(result).not.toContain("🔗");
  });

  it("lists extracted stock tickers when present", () => {
    const posts = [makePost({ title: "NVDA and AMD jump", selftext: "$INTC mentioned too" })];
    const result = buildFallbackMessage(posts);
    expect(result).toContain("关注代码：INTC, AMD, NVDA");
  });

  it("formats detailed report link on its own line", () => {
    const posts = [makePost({ title: "NVDA and AMD jump" })];
    const result = buildFallbackMessage(posts, "https://example.com/reddit-stocks-digest-worker/20260424015246.md");
    expect(result).toContain(`详细版报告:
https://example.com/reddit-stocks-digest-worker/20260424015246.md`);
  });
});
