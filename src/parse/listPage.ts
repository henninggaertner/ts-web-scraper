// src/parse/listPage.ts
// M4 MENTOR DEMO — parsing real HTML with cheerio; type guards; narrowing.
// This file is PURE: (html: string) => data, no I/O. That's what makes it trivially testable.

import * as cheerio from "cheerio"; // VALUE import — we call cheerio.load(...) at runtime
import type { CheerioAPI } from "cheerio"; // TYPE-only import (verbatimModuleSyntax erases it)
import type { JobListing } from "../models/job.js";

const SAP_ORIGIN = "https://jobs.sap.com";

/**
 * Validate a job href and extract what a JobListing needs.
 *
 * Returns `null` for anything that isn't a real job link, so the caller can SKIP a junk
 * row instead of letting it crash the whole parse. Two places the type system forces our hand:
 *   - `href` is `string | undefined` (that's exactly what cheerio's `.attr()` hands back) → narrow it
 *   - `match[1]` is `string | undefined` under `noUncheckedIndexedAccess` → prove it's there
 *
 * The `... | null` return value is a poor-man's type guard: after `if (parsed === null) return;`
 * the compiler NARROWS `parsed` to the object form, so `.detailUrl`/`.jobId` are safe.
 */
export function parseJobHref(
  href: string | undefined,
): { detailUrl: string; jobId: string } | null {
  if (href == null) return null; // `== null` catches BOTH null and undefined
  const match = /\/job\/[^/]+-\d+\/(\d+)\//.exec(href);
  if (match === null) return null; // not a job-detail URL shape
  const jobId = match[1]; // capture group 1...
  if (jobId === undefined) return null; // ...which noUncheckedIndexedAccess types as string | undefined
  const detailUrl = new URL(href, SAP_ORIGIN).href; // resolve relative → absolute
  return { detailUrl, jobId };
}

/**
 * Parse a search-results page into JobListings. cheerio gives us a jQuery-like `$`.
 * The per-row extraction is YOUR DIY — the cheatsheet is in the comments below.
 */
export function parseSearchPage(html: string): JobListing[] {
  const $: CheerioAPI = cheerio.load(html);
  const listings: JobListing[] = [];

  $(".data-row").each((_i, row) => {
    const $row = $(row);
    // DIY — fill this in, then `listings.push(...)`:
    //   const $link = $row.find("a.jobTitle-link").first();
    //        ^ .first() is REQUIRED: each row carries phone + desktop COPIES of the link,
    //          so a naive .find() double-counts (50 links across 25 rows). Real-world HTML mess.
    //   const href = $link.attr("href");          // string | undefined
    //   const parsed = parseJobHref(href);
    //   if (parsed === null) return;              // skip a junk row (return == "continue" inside .each)
    //   const title = $link.text().trim();        // .text() returns string, ALREADY entity-decoded
    //   const location = $row.find(".jobLocation").first().text().trim();
    //   listings.push({ title, location, detailUrl: parsed.detailUrl, jobId: parsed.jobId });
  });

  return listings;
}
