// src/scrape/scrapeListings.ts
// M5 MENTOR DEMO — the IMPURE shell that walks pagination. It orchestrates two things you've
// already built: the network layer (fetchWithRetry) and the PURE parser (parseSearchPage).
// New concept here: a loop of SEQUENTIAL awaits, narrowing a Result each time, and a STOP
// condition we DERIVE from the page rather than trusting a brittle exact count.
import { fetchWithRetry } from "../net/fetchWithRetry.js";
import { parseSearchPage, parsePaginationCount } from "../parse/listPage.js";
import type { JobListing } from "../models/job.js";

// SAP serves 25 rows per page; pagination is offset-based via ?startrow=0,25,50,...
const PAGE_SIZE = 25;

/**
 * Walk the search results, page by page, up to `maxPages`. Returns every JobListing found.
 *
 * Sequential, not parallel: we `await` one page before requesting the next. That's deliberate
 * politeness — hammering all pages at once is exactly what a descriptive User-Agent promises NOT
 * to do. (Bounded *concurrency* comes in M6, for detail pages, where it's worth it.)
 */
export async function scrapeListings(searchUrl: string, maxPages: number): Promise<JobListing[]> {
  const all: JobListing[] = [];
  // Upper bound on pages. Starts at maxPages; the first page's label tightens it to the real total.
  let lastPage = maxPages;

  for (let page = 0; page < Math.min(maxPages, lastPage); page++) {
    const url = new URL(searchUrl); // parse once, then mutate the query string safely
    url.searchParams.set("startrow", String(page * PAGE_SIZE)); // 0, 25, 50, ...

    const result = await fetchWithRetry(url.href); // ONE page at a time
    if (!result.ok) {
      // A page failed after retries — give up the walk, keep what we already have.
      console.error(`page ${page} failed: ${result.error.message}`);
      break;
    }
    const html = result.value; // narrowed: result.ok is true here, so .value exists

    // On the first page only, read the total and convert it to a page count.
    // DERIVED, not asserted: ceil(total / PAGE_SIZE), so a partial last page still counts.
    if (page === 0) {
      const total = parsePaginationCount(html);
      if (total !== null) lastPage = Math.ceil(total / PAGE_SIZE);
    }

    const listings = parseSearchPage(html);
    if (listings.length === 0) break; // belt-and-suspenders: ran past the end → stop
    all.push(...listings);
  }

  return all;
}
