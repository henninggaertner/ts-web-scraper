// src/index.ts
// M2 MENTOR DEMO — our first real fetch, top-level await, and `unknown` in a catch.
// (The M0 throw-demo lived here; it did its job. errors.ts stays and gets used for
//  real in M5. In M8 this entry point splits into a proper cli.ts.)
import { fetchPage } from "./net/fetchPage.js";

const SEARCH_URL = "https://jobs.sap.com/search/?q=&locationsearch=Berlin+Potsdam";

// Top-level await is allowed in ESM — no wrapper function needed.
try {
  const result = await fetchPage(SEARCH_URL);
  if (result.ok) {
    const preview = result.value.slice(0, 80).replace(/\s+/g, " ");
    console.log(`first 80 chars: ${preview}`);
  } else {
    console.error(result.error.message);
  }
} catch (e: unknown) {
  // STRICT MODE TYPES `e` AS `unknown`, not `any`. You literally cannot touch it
  // until you prove what it is — because you don't actually know what was thrown
  // (JS lets you `throw` anything: an Error, a string, a number, undefined...).
  // Narrow first, then use:
  const message = e instanceof Error ? e.message : String(e);
  console.error(`fetch failed: ${message}`);
}
