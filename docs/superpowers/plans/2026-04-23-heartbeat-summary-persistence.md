# Heartbeat + Summary Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add KV-backed heartbeat/failure state and D1-backed final digest summary storage to the Reddit stocks worker.

**Architecture:** Keep Reddit posts request-scoped only, persist lightweight runtime state in KV, and persist only the final generated digest payload in D1. Extract pure runtime-state helpers for testability and keep the Worker entrypoint thin.

**Tech Stack:** Cloudflare Workers, KV, D1, TypeScript, Vitest

---

### Task 1: LLM fallback correctness

**Files:**
- Modify: `src/services/llm.ts`
- Test: `test/llm.test.ts`

- [ ] Add a failing test that proves `chat/completions` empty content falls back to streamed SSE parsing.
- [ ] Run `npm test -- test/llm.test.ts` and confirm it fails with empty response.
- [ ] Implement minimal fallback parsing in `src/services/llm.ts`.
- [ ] Re-run `npm test -- test/llm.test.ts` and confirm it passes.

### Task 2: Runtime heartbeat state helpers

**Files:**
- Create: `src/lib/runtime.ts`
- Modify: `src/types.ts`
- Test: `test/runtime.test.ts`

- [ ] Add failing tests for success/failure state transitions and heartbeat/failure-alert scheduling.
- [ ] Run `npm test -- test/runtime.test.ts` and confirm failure.
- [ ] Implement pure helper functions for KV state transitions.
- [ ] Re-run the targeted tests and confirm pass.

### Task 3: D1 summary storage surface

**Files:**
- Create: `src/db.ts`
- Create: `migrations/0001_init.sql`
- Modify: `src/types.ts`

- [ ] Add storage API for inserting/updating final digest summaries.
- [ ] Add D1 schema for summary records only.
- [ ] Keep Reddit raw posts out of persistent storage.

### Task 4: Wire workflow into the Worker

**Files:**
- Modify: `src/index.ts`
- Modify: `src/config.ts`
- Modify: `src/lib/message.ts`
- Modify: `wrangler.jsonc`

- [ ] Read/write KV runtime state around scheduled/manual runs.
- [ ] Persist final digest summary to D1 before/after Feishu push.
- [ ] Send auxiliary heartbeat messages on interval and failure alerts on threshold/cooldown.
- [ ] Keep `/health` endpoint lightweight.

### Task 5: Docs and verification

**Files:**
- Modify: `README.md`
- Modify: `.dev.vars.example`
- Modify: `.github/workflows/deploy.yml`

- [ ] Document new KV/D1 bindings and required secrets/vars.
- [ ] Run `npm run check`.
- [ ] Run a local `wrangler dev` smoke test where feasible.
