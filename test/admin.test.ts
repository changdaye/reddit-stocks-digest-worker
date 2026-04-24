import { describe, expect, it } from "vitest";
import { readBearerToken, authorizeAdminRequest } from "../src/lib/admin";

function makeRequest(authHeader?: string): Request {
  const headers = new Headers();
  if (authHeader) headers.set("Authorization", authHeader);
  return new Request("https://example.com/admin/trigger", { method: "POST", headers });
}

describe("readBearerToken", () => {
  it("extracts token from Bearer header", () => {
    expect(readBearerToken(makeRequest("Bearer my-secret-token"))).toBe("my-secret-token");
  });

  it("returns empty string without header", () => {
    expect(readBearerToken(makeRequest())).toBe("");
  });

  it("returns empty string for non-Bearer scheme", () => {
    expect(readBearerToken(makeRequest("Basic abc123"))).toBe("");
  });
});

describe("authorizeAdminRequest", () => {
  it("returns ok for matching token", () => {
    const result = authorizeAdminRequest(makeRequest("Bearer correct"), "correct");
    expect(result).toEqual({ ok: true, status: 200 });
  });

  it("returns 503 when token not configured", () => {
    const result = authorizeAdminRequest(makeRequest("Bearer any"), "");
    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
  });

  it("returns 401 when no token presented", () => {
    const result = authorizeAdminRequest(makeRequest(), "expected");
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it("returns 403 for wrong token", () => {
    const result = authorizeAdminRequest(makeRequest("Bearer wrong"), "expected");
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
  });
});
