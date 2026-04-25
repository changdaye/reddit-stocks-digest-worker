# reddit-stocks-digest-worker

Cloudflare Worker：定时抓取 Reddit `r/stocks` 热门帖子，调用 Cloudflare Workers AI 生成中文摘要，并推送到飞书机器人。

## 功能

- 每 3 小时抓取一次 `r/stocks` 热门帖子
- 优先走 Cloudflare Workers AI 生成简短中文财经摘要
- LLM 不可用时自动回退到原始热门帖子列表
- 使用 KV 保存心跳、最近成功/失败时间、连续失败次数
- 使用 D1 仅保存最终生成的摘要结果，不保存原始帖子历史
- 额外生成超详细版 Markdown 报告并上传到腾讯云 COS
- 提供 `/health` 健康检查
- 提供 `/admin/trigger` 手动触发接口（Bearer Token）
- GitHub Actions CI + Cloudflare 自动部署

## 本地开发

```bash
npm install
npm run check
npm run dev
```

本地密钥放在 `.dev.vars`（已加入 `.gitignore`）。可参考 `.dev.vars.example`。

## 环境变量

### Wrangler vars

- `LLM_BASE_URL`：可选；设置后优先调用 OpenAI-compatible `chat/completions` 端点
- `LLM_API_KEY`：可选；与 `LLM_BASE_URL` 配套使用
- `POST_LIMIT`：抓取条数，默认 `20`
- `REQUEST_TIMEOUT_MS`：Reddit 请求超时，默认 `15000`
- `LLM_MODEL`：默认 `@cf/meta/llama-3.1-8b-instruct`；当配置代理时可设为例如 `gpt-5.4`
- `HEARTBEAT_INTERVAL_HOURS`：心跳间隔，默认 `24`
- `FAILURE_ALERT_THRESHOLD`：连续失败达到多少次后告警，默认 `1`
- `FAILURE_ALERT_COOLDOWN_MINUTES`：失败告警冷却时间，默认 `180`

### Secrets

- `FEISHU_WEBHOOK`
- `FEISHU_SECRET`
- `MANUAL_TRIGGER_TOKEN`
- `REDDIT_COOKIE`（可选；当 Reddit 未登录抓取被风控时可配置）
- `TENCENT_COS_SECRET_ID`
- `TENCENT_COS_SECRET_KEY`
- `TENCENT_COS_BUCKET`
- `TENCENT_COS_REGION`
- `TENCENT_COS_BASE_URL`（可选，自定义访问域名）

### Cloudflare 资源绑定

- `AI`：Workers AI binding，用于在代理未配置或代理失败时生成摘要
- `HEARTBEAT_KV`：KV namespace，用于保存心跳状态
- `SUMMARIES_DB`：D1 数据库，用于保存最终摘要

首次部署前需要：

```bash
wrangler kv namespace create HEARTBEAT_KV
wrangler d1 create reddit-stocks-digest
wrangler d1 migrations apply reddit-stocks-digest --local
```

然后把生成的 namespace id / database id 写回 `wrangler.jsonc`。

## 手动触发

```bash
curl -X POST http://127.0.0.1:8787/admin/trigger \
  -H "Authorization: Bearer <MANUAL_TRIGGER_TOKEN>"
```

## 部署

```bash
npm run deploy
```

如果使用 GitHub Actions，需要在仓库 Secrets 中配置：

- `CLOUDFLARE_API_TOKEN`
- `FEISHU_WEBHOOK`
- `FEISHU_SECRET`
- `MANUAL_TRIGGER_TOKEN`

部署前还需要确保 `wrangler.jsonc` 中的 `AI`、`HEARTBEAT_KV` 和 `SUMMARIES_DB` 绑定已经配置正确。
