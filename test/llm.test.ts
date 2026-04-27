import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeWithLLM } from "../src/services/llm";
import type { DigestConfig, RedditPost } from "../src/types";

const config: DigestConfig = {
  feishuWebhook: "https://example.com/hook",
  feishuSecret: "",
  postLimit: 20,
  requestTimeoutMs: 15000,
  manualTriggerToken: "token",
  cosSecretId: "secret-id",
  cosSecretKey: "secret-key",
  cosBucket: "bucket",
  cosRegion: "na-ashburn",
  cosBaseUrl: "https://bucket.cos.na-ashburn.myqcloud.com",
  workerPublicBaseUrl: "https://example.workers.dev",
  llmBaseUrl: "",
  llmApiKey: "",
  llmModel: "@cf/meta/llama-3.1-8b-instruct",
  redditCookie: "",
  heartbeatIntervalHours: 24,
  failureAlertThreshold: 1,
  failureAlertCooldownMinutes: 180,
  finalSummaryHourLocal: 0,
  finalSummaryMinuteLocal: 30,
  finalSummaryLookbackHours: 24,
  marketTimezone: "Asia/Shanghai",
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
  it("uses Workers AI when the selected model is a Cloudflare model even if proxy settings exist", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const run = vi.fn().mockResolvedValue({ response: "Workers AI 直接执行。" });
    const ai = { run } as unknown as Ai;

    await expect(
      analyzeWithLLM(
        {
          ...config,
          llmBaseUrl: "http://34.146.152.231:8317/api/provider/openai/v1",
          llmApiKey: "proxy-key",
          llmModel: "@cf/meta/llama-3.1-8b-instruct",
        },
        ai,
        posts,
      ),
    ).resolves.toEqual({
      analysis: "Workers AI 直接执行。",
      modelLabel: "Llama 3.1 8B Instruct",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0]?.[0]).toBe("@cf/meta/llama-3.1-8b-instruct");
  });

  it("prefers the OpenAI-compatible proxy when configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "代理 GPT-5.4 分析：市场对大型科技股仍偏乐观。",
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const run = vi.fn();
    const ai = { run } as unknown as Ai;

    await expect(
      analyzeWithLLM(
        {
          ...config,
          llmBaseUrl: "http://34.146.152.231:8317/api/provider/openai/v1",
          llmApiKey: "proxy-key",
          llmModel: "gpt-5.4",
        },
        ai,
        posts,
      ),
    ).resolves.toEqual({
      analysis: "代理 GPT-5.4 分析：市场对大型科技股仍偏乐观。",
      modelLabel: "GPT 5.4 (xhigh)",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://34.146.152.231:8317/api/provider/openai/v1/chat/completions");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer proxy-key",
      },
    });
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toMatchObject({
      model: "gpt-5.4",
      reasoning_effort: "xhigh",
      max_completion_tokens: 900,
      temperature: 0.3,
      max_tokens: 800,
      messages: [
        { role: "system", content: expect.stringContaining("你是一位专业的财经分析师") },
        { role: "user", content: expect.stringContaining("以下是 Reddit r/stocks 当前的 1 条热门帖子：") },
      ],
    });
    expect(run).not.toHaveBeenCalled();
  });

  it("falls back to Workers AI when the OpenAI-compatible proxy fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("upstream down", { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);

    const run = vi.fn().mockResolvedValue({ response: "Workers AI 回退成功。" });
    const ai = { run } as unknown as Ai;

    await expect(
      analyzeWithLLM(
        {
          ...config,
          llmBaseUrl: "http://34.146.152.231:8317/api/provider/openai/v1",
          llmApiKey: "proxy-key",
          llmModel: "gpt-5.4",
        },
        ai,
        posts,
      ),
    ).resolves.toEqual({
      analysis: "Workers AI 回退成功。",
      modelLabel: "Llama 3.1 8B Instruct",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0]?.[0]).toBe("@cf/meta/llama-3.1-8b-instruct");
  });

  it("uses Workers AI prompt inference and returns the response text", async () => {
    const run = vi.fn().mockResolvedValue({ response: "市场情绪偏多，科技股热度较高。" });
    const ai = { run } as unknown as Ai;

    await expect(analyzeWithLLM(config, ai, posts)).resolves.toEqual({
      analysis: "市场情绪偏多，科技股热度较高。",
      modelLabel: "Llama 3.1 8B Instruct",
    });
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0]?.[0]).toBe("@cf/meta/llama-3.1-8b-instruct");
    expect(run.mock.calls[0]?.[1]).toMatchObject({
      max_tokens: 800,
      temperature: 0.3,
      prompt: expect.stringContaining("以下是 Reddit r/stocks 当前的 1 条热门帖子："),
    });
    expect(run.mock.calls[0]?.[2]).toEqual({ gateway: { id: "default" } });
  });

  it("throws when Workers AI returns an empty response", async () => {
    const ai = { run: vi.fn().mockResolvedValue({ response: "" }) } as unknown as Ai;
    await expect(analyzeWithLLM(config, ai, posts)).rejects.toThrow("Workers AI returned empty response");
  });
});
