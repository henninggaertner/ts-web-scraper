import { fetchWithRetry } from "../src/net/fetchWithRetry.js"
import { describe, it, expect, vi, afterEach } from "vitest";
afterEach(() => vi.unstubAllGlobals());

describe("fetchWithRetry", () => {
  it("retry test", async () => {
    const fakeFetch = vi.fn();              // a function that records calls
    fakeFetch.mockResolvedValue(new Response("body html", { "status": 200 })); // "whenever called, resolve to `something`"
    fakeFetch.mockResolvedValueOnce(new Response("", { "status": 429, "headers": { "retry-after": "0" } }))      // 1st call → a
    vi.stubGlobal("fetch", fakeFetch)
    const result = await fetchWithRetry("url");
    expect(fakeFetch).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unexpected failure");  // narrows result → the error branch below
    expect(result.value.length).toBeGreaterThan(0);

  });
  it("no-retry test", async () => {
    const fakeFetch = vi.fn();              // a function that records calls
    fakeFetch.mockResolvedValue(new Response("", { "status": 404 })); // "whenever called, resolve to `something`"
    vi.stubGlobal("fetch", fakeFetch)
    const result = await fetchWithRetry("url");
    expect(fakeFetch).toHaveBeenCalledTimes(1);
    if (result.ok) throw new Error("expected failure");  // narrows result → the error branch below
    expect(result.error.statusCode).toBe(404);
  });

});
