import { describe, expect, it } from "vitest";
import {
  recordFailure,
  recordSuccess,
  shouldSendFailureAlert,
  shouldSendHeartbeat,
} from "../src/lib/runtime";
import type { RuntimeState } from "../src/types";

function state(overrides: Partial<RuntimeState> = {}): RuntimeState {
  return {
    consecutiveFailures: 0,
    ...overrides,
  };
}

describe("recordSuccess", () => {
  it("resets failure counters and timestamps the success", () => {
    const next = recordSuccess(
      state({ consecutiveFailures: 3, lastError: "boom", lastFailureAt: "2026-04-23T00:00:00.000Z" }),
      new Date("2026-04-23T06:00:00.000Z"),
    );

    expect(next.consecutiveFailures).toBe(0);
    expect(next.lastSuccessAt).toBe("2026-04-23T06:00:00.000Z");
    expect(next.lastError).toBeUndefined();
  });
});

describe("recordFailure", () => {
  it("increments consecutive failures and records the error", () => {
    const next = recordFailure(state({ consecutiveFailures: 1 }), "reddit 403", new Date("2026-04-23T07:00:00.000Z"));

    expect(next.consecutiveFailures).toBe(2);
    expect(next.lastFailureAt).toBe("2026-04-23T07:00:00.000Z");
    expect(next.lastError).toBe("reddit 403");
  });
});

describe("shouldSendHeartbeat", () => {
  it("sends the first heartbeat when none has been sent", () => {
    expect(shouldSendHeartbeat(state(), 6, new Date("2026-04-23T06:00:00.000Z"))).toBe(true);
  });

  it("waits until the configured interval has elapsed", () => {
    expect(
      shouldSendHeartbeat(
        state({ lastHeartbeatAt: "2026-04-23T03:00:00.000Z" }),
        6,
        new Date("2026-04-23T06:00:00.000Z"),
      ),
    ).toBe(false);
  });
});

describe("shouldSendFailureAlert", () => {
  it("sends once the failure threshold is reached", () => {
    expect(
      shouldSendFailureAlert(
        state({ consecutiveFailures: 2, lastFailureAt: "2026-04-23T06:00:00.000Z", lastError: "timeout" }),
        2,
        180,
        new Date("2026-04-23T06:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("respects the alert cooldown window", () => {
    expect(
      shouldSendFailureAlert(
        state({
          consecutiveFailures: 3,
          lastFailureAt: "2026-04-23T06:00:00.000Z",
          lastAlertAt: "2026-04-23T05:00:00.000Z",
        }),
        2,
        180,
        new Date("2026-04-23T06:00:00.000Z"),
      ),
    ).toBe(false);
  });
});
