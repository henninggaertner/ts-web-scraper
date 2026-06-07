// src/net/fetchPage.ts
// M2 MENTOR DEMO — async/await and Promise<T>.
import { type Result, ok, err } from "../models/result.js";
import { FetchError, toMessage } from "../errors.js";
/**
 * Fetch a page and return its raw HTML.
 *
 * `async` means this function ALWAYS returns a Promise. The annotation
 * `: Promise<string>` is the contract: "await me and you'll get a string back".
 * Node 18+ ships a global `fetch` (no import needed). Its types currently come
 * from TypeScript's built-in DOM lib — in M5 we'll switch the project over to
 * proper Node typings and explain why.
 */
export async function fetchPage(url: string): Promise<Result<string, FetchError>> {
  try {
  const res = await fetch(url, {
    // A descriptive User-Agent is polite (it identifies us) and pragmatic
    // (some sites reject the default bare client). M5 makes this rigorous.
    headers: { "user-agent": "sap-jobs-scraper/0.1 (learning project)" },
  });
  if (!res.ok) {
    return err(new FetchError('Failed to fetch', url, res.status))
  }
  console.log(`GET ${url} -> ${res.status} ${res.statusText}`);
  const html = await res.text(); // `res.text()` is itself a Promise<string> — await it
  console.log(`  received ${html.length} bytes`);
  return ok(html)
  } catch (e: unknown) {
    return err(new FetchError(toMessage(e), url)); // netowrk / timeout
  }
}
