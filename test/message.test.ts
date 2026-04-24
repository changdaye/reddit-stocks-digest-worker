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
  it("formats AI digest header and analysis", () => {
    const posts = [makePost({ title: "AAPL earnings beat" })];
    const result = buildDigestMessage("市场情绪偏多，科技股讨论热度较高。", posts, new Date("2026-04-23T06:00:00Z"));
    expect(result).toContain("Reddit r/stocks 财经日报");
    expect(result).toContain("2026-04-23 06:00 UTC");
    expect(result).toContain("市场情绪偏多，科技股讨论热度较高。");
    expect(result).toContain("AAPL earnings beat");
  });

  it("includes at most five source links", () => {
    const posts = Array.from({ length: 6 }, (_, i) =>
      makePost({
        title: `Post ${i + 1}`,
        permalink: `/r/stocks/comments/${i + 1}/post_${i + 1}/`,
      }),
    );
    const result = buildDigestMessage("今日重点如下", posts);
    expect(result).toContain("/r/stocks/comments/1/post_1/");
    expect(result).toContain("/r/stocks/comments/5/post_5/");
    expect(result).not.toContain("/r/stocks/comments/6/post_6/");
  });

  it("truncates long source titles in link section", () => {
    const posts = [makePost({ title: "A".repeat(70) })];
    const result = buildDigestMessage("测试摘要", posts);
    expect(result).toContain(`${"A".repeat(60)}...`);
  });
});

describe("buildFallbackMessage", () => {
  it("formats posts with score and comments", () => {
    const posts = [makePost({ title: "AAPL earnings beat", score: 1234, numComments: 567 })];
    const result = buildFallbackMessage(posts, new Date("2026-04-23T06:00:00Z"));
    expect(result).toContain("Reddit r/stocks 热门帖子");
    expect(result).toContain("AI 分析不可用");
    expect(result).toContain("2026-04-23 06:00 UTC");
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
    expect(result).toContain("Reddit r/stocks 热门帖子");
    expect(result).toContain("共 0 条热门帖子");
  });

  it("includes permalink as link", () => {
    const posts = [makePost({ permalink: "/r/stocks/comments/xyz/my_post/" })];
    const result = buildFallbackMessage(posts);
    expect(result).toContain("https://www.reddit.com/r/stocks/comments/xyz/my_post/");
  });
});
