// src/index.ts
// M2 MENTOR DEMO — our first real fetch, top-level await, and `unknown` in a catch.
// (The M0 throw-demo lived here; it did its job. errors.ts stays and gets used for
//  real in M5. In M8 this entry point splits into a proper cli.ts.)
import { fetchWithRetry } from "./net/fetchWithRetry.js";
import { parseSearchPage } from "./parse/listPage.js";
import { scrapeListings } from "./scrape/scrapeListings.js";

const SEARCH_URL = "https://jobs.sap.com/search/?q=&locationsearch=Berlin+Potsdam";
const RETRIES = 3;
const MAX_PAGES = 3;

// Top-level await is allowed in ESM — no wrapper function needed.
const results = await scrapeListings(SEARCH_URL, MAX_PAGES);
results.forEach(jobListing => {
    console.log(jobListing)
});