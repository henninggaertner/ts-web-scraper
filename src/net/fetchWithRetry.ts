// src/net/fetchWithRetry.ts
// M5 MENTOR DEMO — a real network layer. This is where M2/M3's `unknown`-in-catch finally
// pays off: against ACTUAL transport failures (timeouts, resets, DNS), not just bad data.
//
// It keeps the same contract as before — `Promise<Result<string, FetchError>>` — so callers
// are unchanged; it just got smarter about *transport lies* (403/429/503, Retry-After, timeouts).
import { type Result, ok, err } from "../models/result.js";
import { FetchError } from "../errors.js";

// A descriptive User-Agent is an ETHICS signal (we identify ourselves) AND pragmatic:
// many sites (TalentBrew/Radancy included) treat a bare default client differently / 403 it.
const UA = "sap-jobs-scraper/0.1 (+https://example.com/you; learning project)";

/** Promise-based sleep — resolves (void) after `ms`. The typed building block for backoff. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parse a `Retry-After` header — either delta-seconds ("120") or an HTTP date — into ms, or null. */
function retryAfterMs(res: Response): number | null {
  const header = res.headers.get("retry-after"); // string | null
  if (header === null) return null;
  const seconds = Number(header);
  if (!Number.isNaN(seconds)) return seconds * 1000;
  const dateMs = Date.parse(header);
  if (Number.isNaN(dateMs)) return null;
  return Math.max(0, dateMs - Date.now());
}

/** Exponential backoff with full jitter (avoids a synchronized "thundering herd" of retries). */
function backoffJitter(attempt: number): number {
  const ceiling = 300 * 2 ** attempt; // 300, 600, 1200, 2400 ms ...
  return Math.random() * ceiling;
}

/**
 * Fetch a URL, retrying transient failures. Returns the HTML as a Result — never throws
 * for an expected failure (the M3 rule). `tries` is optional with a default (M2: optional params).
 */
export async function fetchWithRetry(url: string, tries = 4): Promise<Result<string, FetchError>> {
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": UA },
        signal: AbortSignal.timeout(10_000), // aborts after 10s → throws (caught below)
      });

      // Throttled / temporarily down → wait (honoring Retry-After) and retry.
      if (res.status === 429 || res.status === 503) {
        if (attempt < tries - 1) {
          await sleep(retryAfterMs(res) ?? backoffJitter(attempt));
          continue;
        }
        return err(new FetchError(`rate-limited (HTTP ${res.status})`, url, res.status));
      }

      if (!res.ok) return err(new FetchError(`HTTP ${res.status}`, url, res.status)); // 404 etc — don't retry
      return ok(await res.text());
    } catch (e: unknown) {
      // Transport failure: timeout (AbortSignal), connection reset, DNS, ... You do NOT know the
      // shape of `e`, so narrow before use — exactly the discipline M2/M3 set up.
      const message = e instanceof Error ? e.message : String(e);
      if (attempt === tries - 1) return err(new FetchError(message, url));
      await sleep(backoffJitter(attempt));
    }
  }
  // The loop returns on its last iteration; this satisfies the compiler (it can't prove
  // `tries >= 1`) and documents intent.
  return err(new FetchError("exhausted retries", url));
}
