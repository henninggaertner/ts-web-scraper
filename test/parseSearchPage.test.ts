// test/parseSearchPage.test.ts
// M4 — the first test. PURE parser + saved fixture = a fast, offline, deterministic check.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { parseSearchPage } from "../src/parse/listPage.js";

// Load the REAL page we saved in M2. `fileURLToPath(new URL("./...", import.meta.url))`
// replaces `__dirname`, which DOES NOT EXIST in ESM — M5 explains this dance in full.
const html = readFileSync(
  fileURLToPath(new URL("./fixtures/search-page.html", import.meta.url)),
  "utf8",
);

describe("parseSearchPage", () => {
  it("extracts all 25 listings from one search page", () => {
    const jobs = parseSearchPage(html);
    const first = jobs[0]
    expect(jobs).toHaveLength(25);
    expect(first).toBeDefined();
    expect(first?.title.length).toBeGreaterThan(0);
    expect(first?.detailUrl).toMatch(/^https:\/\/jobs\.sap\.com\/job\//);
    expect(first?.jobId).toMatch(/^\d+$/);

  });
  it("every listing has an absolute job URL and a numeric id", () => {
    for (const job of parseSearchPage(html)) {   // iterating gives `JobListing` (not undefined) — no `?.` needed
      expect(job.detailUrl).toMatch(/^https:\/\/jobs\.sap\.com\/job\//);
      expect(job.jobId).toMatch(/^\d+$/);
    }
  });

  // DIY: add assertions about jobs[0] — see the prompt.
});
