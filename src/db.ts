import type { DigestSummaryRecord, RedditPost } from "./types";

function nowIso(now = new Date()): string {
  return now.toISOString();
}

export async function insertDigestSummary(
  db: D1Database,
  input: {
    id: string;
    postCount: number;
    aiAnalysis: boolean;
    messageText: string;
    analysisText?: string;
    posts: RedditPost[];
    now?: Date;
  },
): Promise<void> {
  const topPostsJson = JSON.stringify(
    input.posts.slice(0, 5).map((post) => ({
      title: post.title,
      permalink: post.permalink,
      score: post.score,
      numComments: post.numComments,
      flair: post.linkFlairText,
    })),
  );

  await db
    .prepare(`INSERT INTO digest_summaries (
      id, created_at, post_count, ai_analysis, message_text, analysis_text, top_posts_json, feishu_push_ok, push_error
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL)`)
    .bind(
      input.id,
      nowIso(input.now),
      input.postCount,
      input.aiAnalysis ? 1 : 0,
      input.messageText,
      input.analysisText ?? null,
      topPostsJson,
    )
    .run();
}

export async function markDigestSummaryPushed(db: D1Database, id: string, success: boolean, error?: string): Promise<void> {
  await db
    .prepare("UPDATE digest_summaries SET feishu_push_ok = ?, push_error = ? WHERE id = ?")
    .bind(success ? 1 : 0, error ?? null, id)
    .run();
}

export async function listRecentSummaries(db: D1Database, limit = 20): Promise<DigestSummaryRecord[]> {
  const rows = await db
    .prepare("SELECT * FROM digest_summaries ORDER BY created_at DESC LIMIT ?")
    .bind(limit)
    .all<Record<string, unknown>>();

  return rows.results.map((row) => ({
    id: String(row.id),
    createdAt: String(row.created_at),
    postCount: Number(row.post_count ?? 0),
    aiAnalysis: Number(row.ai_analysis ?? 0) === 1,
    messageText: String(row.message_text ?? ""),
    analysisText: row.analysis_text ? String(row.analysis_text) : undefined,
    topPostsJson: String(row.top_posts_json ?? "[]"),
    feishuPushOk: Number(row.feishu_push_ok ?? 0) === 1,
    pushError: row.push_error ? String(row.push_error) : undefined,
  }));
}
