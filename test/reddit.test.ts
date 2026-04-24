import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHotPosts } from "../src/services/reddit";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchHotPosts", () => {
  it("adds the reddit cookie header when configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            children: [
              {
                kind: "t3",
                data: {
                  title: "AAPL",
                  author: "u1",
                  score: 10,
                  num_comments: 2,
                  permalink: "/r/stocks/comments/1/aapl/",
                  created_utc: 1714000000,
                  upvote_ratio: 0.9,
                  link_flair_text: null,
                  selftext: "",
                  stickied: false,
                  url: "https://reddit.com/r/stocks/comments/1/aapl/"
                }
              }
            ]
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchHotPosts(1, 1000, "reddit_session=abc123");

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers.Cookie).toBe("reddit_session=abc123");
  });

  it("filters stickied posts and keeps the requested limit", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            children: [
              {
                kind: "t3",
                data: {
                  title: "Pinned",
                  author: "mod",
                  score: 1,
                  num_comments: 1,
                  permalink: "/r/stocks/comments/0/pinned/",
                  created_utc: 1714000000,
                  upvote_ratio: 1,
                  link_flair_text: null,
                  selftext: "",
                  stickied: true,
                  url: "https://reddit.com/r/stocks/comments/0/pinned/"
                }
              },
              {
                kind: "t3",
                data: {
                  title: "Post 1",
                  author: "u1",
                  score: 10,
                  num_comments: 2,
                  permalink: "/r/stocks/comments/1/post_1/",
                  created_utc: 1714000001,
                  upvote_ratio: 0.9,
                  link_flair_text: null,
                  selftext: "",
                  stickied: false,
                  url: "https://reddit.com/r/stocks/comments/1/post_1/"
                }
              },
              {
                kind: "t3",
                data: {
                  title: "Post 2",
                  author: "u2",
                  score: 20,
                  num_comments: 3,
                  permalink: "/r/stocks/comments/2/post_2/",
                  created_utc: 1714000002,
                  upvote_ratio: 0.95,
                  link_flair_text: "News",
                  selftext: "",
                  stickied: false,
                  url: "https://reddit.com/r/stocks/comments/2/post_2/"
                }
              }
            ]
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const posts = await fetchHotPosts(1, 1000);

    expect(posts).toHaveLength(1);
    expect(posts[0]?.title).toBe("Post 1");
  });
});
