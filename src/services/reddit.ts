import type { RedditPost } from "../types";

const REDDIT_BASE = "https://www.reddit.com";
const USER_AGENT = "reddit-stocks-digest-worker/0.1.0 (Cloudflare Worker)";

interface RedditChildData {
  title: string;
  author: string;
  score: number;
  num_comments: number;
  permalink: string;
  created_utc: number;
  upvote_ratio: number;
  link_flair_text: string | null;
  selftext: string;
  stickied: boolean;
  url: string;
}

interface RedditListingResponse {
  data: {
    children: Array<{ kind: string; data: RedditChildData }>;
    after: string | null;
  };
}

export async function fetchHotPosts(limit: number, timeoutMs: number, redditCookie = ""): Promise<RedditPost[]> {
  const url = `${REDDIT_BASE}/r/stocks/hot.json?limit=${limit + 5}&raw_json=1`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    };
    if (redditCookie) headers.Cookie = redditCookie;

    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`reddit API HTTP ${response.status}: ${await response.text()}`);
    }
    const listing = (await response.json()) as RedditListingResponse;
    return listing.data.children
      .map((child) => child.data)
      .filter((p) => !p.stickied)
      .slice(0, limit)
      .map((p) => ({
        title: p.title,
        author: p.author,
        score: p.score,
        numComments: p.num_comments,
        permalink: p.permalink,
        createdUtc: p.created_utc,
        upvoteRatio: p.upvote_ratio,
        linkFlairText: p.link_flair_text ?? "",
        selftext: p.selftext,
        stickied: false,
        url: p.url,
      }));
  } finally {
    clearTimeout(timer);
  }
}
