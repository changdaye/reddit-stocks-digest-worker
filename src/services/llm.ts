import type { DigestConfig, LLMAnalysisResult, RedditPost } from "../types";

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

const DEFAULT_WORKERS_AI_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const OPENAI_COMPAT_REASONING_EFFORT = "xhigh";

interface WorkersAIResult {
  response?: string;
}

interface OpenAICompatResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
}

export async function analyzeWithLLM(config: DigestConfig, ai: Ai, posts: RedditPost[]): Promise<LLMAnalysisResult> {
  const postList = posts
    .map((p, i) => {
      const flair = p.linkFlairText ? ` [${p.linkFlairText}]` : "";
      const selftext = p.selftext ? `\n内容: ${p.selftext.slice(0, 300)}` : "";
      return `${i + 1}. [⬆️${p.score} | 💬${p.numComments}]${flair} ${p.title}${selftext}`;
    })
    .join("\n\n");

  const userPrompt = `以下是 Reddit r/stocks 当前的 ${posts.length} 条热门帖子：\n\n${postList}`;

  if (config.llmBaseUrl && config.llmApiKey) {
    try {
      return await analyzeWithOpenAICompatible(config, userPrompt);
    } catch (error) {
      console.error("OpenAI-compatible LLM failed", error instanceof Error ? error.message : String(error));
    }
  }

  return analyzeWithWorkersAI(config, ai, `${SYSTEM_PROMPT}\n\n${userPrompt}`);
}

async function analyzeWithOpenAICompatible(config: DigestConfig, userPrompt: string): Promise<LLMAnalysisResult> {
  const response = await fetch(`${config.llmBaseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.llmApiKey}`,
    },
    body: JSON.stringify({
      model: config.llmModel,
      reasoning_effort: OPENAI_COMPAT_REASONING_EFFORT,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI-compatible HTTP ${response.status}: ${text.slice(0, 500)}`);
  }

  const result = (await response.json()) as OpenAICompatResponse;
  const rawContent = result.choices?.[0]?.message?.content;
  const content = typeof rawContent === "string"
    ? rawContent.trim()
    : rawContent?.map((part) => part.text ?? "").join("").trim();
  if (!content) throw new Error("OpenAI-compatible response returned empty content");
  return {
    analysis: content,
    modelLabel: `${formatModelLabel(config.llmModel)} (${OPENAI_COMPAT_REASONING_EFFORT})`,
  };
}

async function analyzeWithWorkersAI(config: DigestConfig, ai: Ai, prompt: string): Promise<LLMAnalysisResult> {
  const fallbackModel = config.llmModel.startsWith("@cf/") ? config.llmModel : DEFAULT_WORKERS_AI_MODEL;

  const result = (await ai.run(
    fallbackModel,
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
  return {
    analysis: content,
    modelLabel: formatModelLabel(fallbackModel),
  };
}

function formatModelLabel(model: string): string {
  const trimmed = model.trim();
  if (!trimmed) return "Unknown";
  const slug = trimmed.replace(/^@cf\//, "").split("/").pop() ?? trimmed;
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === "gpt") return "GPT";
      if (lower === "llama") return "Llama";
      if (lower === "qwen") return "Qwen";
      if (lower === "gemma") return "Gemma";
      if (lower === "glm") return "GLM";
      if (lower === "mistral") return "Mistral";
      if (lower === "kimi") return "Kimi";
      if (lower === "deepseek") return "DeepSeek";
      if (lower === "fp8") return "FP8";
      if (lower === "awq") return "AWQ";
      if (lower === "it") return "IT";
      if (/^\d+(\.\d+)?b$/i.test(part)) return part.toUpperCase();
      if (/^\d+(\.\d+)?$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}
