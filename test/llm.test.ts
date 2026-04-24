import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeWithLLM } from "../src/services/llm";
import type { DigestConfig, RedditPost } from "../src/types";

const config: DigestConfig = {
  feishuWebhook: "https://example.com/hook",
  feishuSecret: "",
  postLimit: 20,
  requestTimeoutMs: 15000,
  manualTriggerToken: "token",
  llmModel: "@cf/meta/llama-3.1-8b-instruct",
  redditCookie: "",
  heartbeatIntervalHours: 24,
  failureAlertThreshold: 1,
  failureAlertCooldownMinutes: 180,
};

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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("analyzeWithLLM", () => {
  it("uses Workers AI chat inference and returns the response text", async () => {
    const run = vi.fn().mockResolvedValue({ response: "市场情绪偏多，科技股热度较高。" });
    const ai = { run } as unknown as Ai;

    await expect(analyzeWithLLM(config, ai, posts)).resolves.toBe("市场情绪偏多，科技股热度较高。");
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0]?.[0]).toBe("@cf/meta/llama-3.1-8b-instruct");
    expect(run.mock.calls[0]?.[1]).toMatchObject({
      max_tokens: 800,
      temperature: 0.3,
      messages: [
        { role: "system" },
        { role: "user" },
      ],
    });
  });

  it("throws when Workers AI returns an empty response", async () => {
    const ai = { run: vi.fn().mockResolvedValue({ response: "" }) } as unknown as Ai;
    await expect(analyzeWithLLM(config, ai, posts)).rejects.toThrow("Workers AI returned empty response");
  });
});
