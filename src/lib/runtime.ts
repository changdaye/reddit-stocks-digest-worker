import type { RuntimeState } from "../types";

const RUNTIME_STATE_KEY = "runtime_state";

export function recordSuccess(state: RuntimeState, now = new Date()): RuntimeState {
  return {
    ...state,
    consecutiveFailures: 0,
    lastSuccessAt: now.toISOString(),
    lastError: undefined,
  };
}

export function recordFailure(state: RuntimeState, error: string, now = new Date()): RuntimeState {
  return {
    ...state,
    consecutiveFailures: state.consecutiveFailures + 1,
    lastFailureAt: now.toISOString(),
    lastError: error,
  };
}

export function shouldSendHeartbeat(state: RuntimeState, intervalHours: number, now = new Date()): boolean {
  if (!state.lastHeartbeatAt) return true;
  return elapsedMs(state.lastHeartbeatAt, now) >= intervalHours * 60 * 60 * 1000;
}

export function shouldSendFailureAlert(state: RuntimeState, threshold: number, cooldownMinutes: number, now = new Date()): boolean {
  if (state.consecutiveFailures < threshold) return false;
  if (!state.lastAlertAt) return true;
  return elapsedMs(state.lastAlertAt, now) >= cooldownMinutes * 60 * 1000;
}

function elapsedMs(iso: string, now: Date): number {
  return now.getTime() - new Date(iso).getTime();
}

export async function getRuntimeState(kv: KVNamespace): Promise<RuntimeState> {
  const data = await kv.get(RUNTIME_STATE_KEY, "json");
  return ((data as RuntimeState | null) ?? { consecutiveFailures: 0 });
}

export async function setRuntimeState(kv: KVNamespace, state: RuntimeState): Promise<void> {
  await kv.put(RUNTIME_STATE_KEY, JSON.stringify(state));
}
