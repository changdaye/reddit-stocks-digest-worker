import type { DigestConfig, RedditPost } from "../types";

const SYSTEM_PROMPT = `你是一位专业的财经分析师，擅长解读美股市场动态。请根据以下 Reddit r/stocks 热门帖子，生成一份清晰、简洁、但略有细节的中文摘要。

输出要求：
1. 只输出两个部分，且不要重复：
   - 市场概览：2-3 句话，概括整体情绪和主要主题
   - 重点摘要：按重要性排序列出 4-6 条
2. 不要再额外输出“最有价值的帖子分析”和“简洁的中文总结”这种两套重复结构，只保留一套“重点摘要”
3. 每条重点摘要控制在 2-3 句话，比一句话更详细，但不要太长
4. 每条重点摘要都标注情绪倾向（🟢看涨 / 🔴看跌 / ⚪中性）
5. 如果能识别到明确股票代码或公司简称，尽量直接写出来
6. 忽略水帖、重复话题或低质量讨论
7. 总字数控制在 900 字以内
8. 不要输出 Markdown 标题语法（不要用 # 号），也不要使用加粗语法`;

interface WorkersAIResult {
  response?: string;
}

export async function analyzeWithLLM(config: DigestConfig, ai: Ai, posts: RedditPost[]): Promise<string> {
  const postList = posts
    .map((p, i) => {
      const flair = p.linkFlairText ? ` [${p.linkFlairText}]` : "";
      const selftext = p.selftext ? `\n内容: ${p.selftext.slice(0, 300)}` : "";
      return `${i + 1}. [⬆️${p.score} | 💬${p.numComments}]${flair} ${p.title}${selftext}`;
    })
    .join("\n\n");

  const prompt = `${SYSTEM_PROMPT}\n\n以下是 Reddit r/stocks 当前的 ${posts.length} 条热门帖子：\n\n${postList}`;

  const result = (await ai.run(
    config.llmModel,
    {
      prompt,
      max_tokens: 800,
      temperature: 0.3,
    },
    {
      gateway: { id: "default" },
    },
  )) as WorkersAIResult;

  const content = result.response?.trim();
  if (!content) throw new Error("Workers AI returned empty response");
  return content;
}
