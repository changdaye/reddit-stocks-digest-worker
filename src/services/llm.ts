import type { DigestConfig, RedditPost } from "../types";

const SYSTEM_PROMPT = `你是一位专业的财经分析师，擅长解读美股市场动态。请根据以下 Reddit r/stocks 热门帖子，生成一份简洁的中文财经摘要。

要求：
1. 先用 2-3 句话概括当前市场整体情绪和趋势
2. 按重要性排序，挑选最有价值的帖子进行分析
3. 每条新闻用简洁的中文总结，标注情绪倾向（🟢看涨 / 🔴看跌 / ⚪中性）
4. 忽略水帖、重复话题或低质量讨论
5. 总字数控制在 800 字以内
6. 不要输出 Markdown 标题语法（不要用 # 号）`;

interface WorkersAIResult {
  response?: string;
}

export async function analyzeWithLLM(config: DigestConfig, ai: Ai, posts: RedditPost[]): Promise<string> {
  const postList = posts
    .map((p, i) => {
      const flair = p.linkFlairText ? ` [${p.linkFlairText}]` : "";
      const selftext = p.selftext ? `\n   内容: ${p.selftext.slice(0, 300)}` : "";
      return `${i + 1}. [⬆️${p.score} | 💬${p.numComments}]${flair} ${p.title}${selftext}`;
    })
    .join("\n");

  const result = (await ai.run(config.llmModel, {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `以下是 Reddit r/stocks 当前的 ${posts.length} 条热门帖子：\n\n${postList}` },
    ],
    max_tokens: 800,
    temperature: 0.3,
  })) as WorkersAIResult;

  const content = result.response?.trim();
  if (!content) throw new Error("Workers AI returned empty response");
  return content;
}
