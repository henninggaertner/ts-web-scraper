# Learn TypeScript by Building a Real CLI Job Scraper

## Context

You're an experienced polyglot (strong Python; solid C/C++/Java) with little JavaScript, and you want your **first real TypeScript project** to both teach the language properly *and* be a portfolio piece. We're building a **CLI web scraper for SAP job listings** (`https://jobs.sap.com/search/?locationsearch=Berlin+Potsdam`) — a concrete, personally-motivating target you chose.

I inspected the live site today (2026-06-05) to ground everything in reality rather than a toy:

- **`robots.txt` is scraper-friendly**: `/search/` and `/job/` are permitted (by *absence* of a `Disallow` — there are **no `Allow:` rules**). Apply flows (`/talentcommunity/`, `/applybutton/`, `/preapply/`, `/services/`, …) are disallowed → a built-in ethics lesson.
- **The search results page is server-rendered HTML** (~125 KB, no JS needed for v1): 25 listings per page in `.data-row`, each with `<a class="jobTitle-link" href="/job/<City>-<slug>-<reqId>/<jobId>/">Title</a>` and a `.jobLocation`. Pagination is offset-based via `?startrow=25,50,…`; a `.paginationLabel` holds the total count.
- **Job detail pages are rich**: schema.org **microdata** (`itemprop="title|description|datePosted|hiringOrganization"`), `data-careersite-propertyid` attributes, and a pipe-delimited meta row (`Requisition ID | Work Area | Employment Type | Career Status | Expected Travel | Additional Locations`). `datePosted` looks like `"Sat May 09 02:00:00 UTC 2026"`.

This gives an ideal **two-level scrape** (list page → per-job detail enrichment) that naturally motivates async TypeScript, typed data models, concurrency + rate limiting, and the compile-time-vs-runtime gap.

**Your choices (locked in):** progressive engine (static `fetch`+cheerio first → Playwright as an optional advanced milestone); portfolio-grade polish (tests, CLI UX, lint, README, CI); "learn the build then go fast" (real `tsc` compile first, then `tsx` for the dev loop).

### How we'll work — demo-then-DIY (this is the core of the plan)

This is a **mentored learning project, not a code-dump**. Each milestone runs four beats:
1. **MENTOR demo** — I write *one* worked example of the new concept end-to-end, narrating the TS-specific decision.
2. **LEARNER DIY** — *you* immediately apply the same concept to the next similar piece. Same shape, your hands. I review.
3. **"Done when"** — a concrete, checkable acceptance test (usually offline, so a live-site change can't block you).
4. **README beat** — you add 2–4 sentences explaining the type decision you just made (the README grows from M3 on).

We teach **only what's genuinely new vs Python/Java** — never variables/loops/functions. We let the *scraper feature force the concept into existence*: cheerio's `.attr('href')` returning `string | undefined` is *why* you narrow; one helper serving two models is *why* you reach for generics; microdata that may be absent is *why* a compiled type isn't a runtime guarantee.

**The spine thesis** (and the README opener): *Compile-time types are claims about data you control; scraped HTML is data you don't.* Build the type system, trust it, then deliberately break the illusion with runtime validation — because both the **data** lies (malformed fields) and the **transport** lies (403s, 429s, timeouts).

---

## Tooling & setup sequence

**Environment (verified):** Node v22.18, npm 10.9, no global `tsc`/`bun`/`deno`. We install everything **per-project** (reproducible builds), never globally.

**tsc-first, then tsx:**
```
npm init -y                      # then set "type": "module" in package.json (ESM)
npm i -D typescript              # install latest; tsc compiler
# write src/index.ts, then:
npx tsc                          # PHASE 1: emit dist/ — OPEN dist/index.js together,
                                 #   watch annotations vanish; add a type error → build fails.
                                 #   This erasure mental model is what M7 depends on.
npm i -D tsx                     # PHASE 2 (from M2): instant dev loop, no emit
```
**The rule, repeated all course:** `tsx` *runs* (strips types, does NOT type-check); `tsc --noEmit` *checks*. CI runs both.

`package.json` scripts:
```json
{
  "scripts": {
    "dev": "tsx src/cli.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint": "eslint .",
    "format": "prettier --write .",
    "check": "npm run typecheck && npm run lint && npm run test"
  }
}
```

**Dependencies** (each is both a TS lesson and the professional choice — this table becomes a README section). Install latest at each milestone; pin whatever npm resolves.

| Dep | Introduced | Why / what it teaches |
|---|---|---|
| `typescript` | M0 | `tsc` first, to *see* what TS does (type erasure). |
| `tsx` | M2 | Fast dev loop (esbuild). Teaches dev-vs-build split: it runs, it doesn't check. |
| `cheerio` | M4 | Server-side HTML parsing (no browser needed). **Ships its own types** → the "when do I need `@types/*`?" lesson. Its ESM import surface is the first `import type` puzzle. |
| `vitest` | M4/M5 | TS-first, ESM-native test runner. Pure parsers test trivially. |
| `p-limit` | M6 | Correct bounded concurrency vs `Promise.all` carpet-bombing the live site. |
| `zod` | M7 | Runtime validation that *infers* its static type — the compile/runtime-gap centerpiece. |
| `commander` | M8 | Declarative, well-typed CLI. Hand-roll argv once (feel the pain), then adopt. |
| `eslint` + `typescript-eslint` + `prettier` | M8 | Type-aware lint catches floating promises & bans `any`; prettier owns formatting. |
| `playwright` | M10 (optional) | Industry-standard browser engine, introduced *behind an interface* as a skippable advanced fallback (~300 MB browser download). |

### `tsconfig.json` — strict, introduced in two waves

**M0 baseline** (don't front-load every flag, but start strict):
```jsonc
{
  "compilerOptions": {
    "target": "es2023",
    "module": "nodenext",
    "moduleResolution": "nodenext",   // ESM: relative imports need explicit .js extension
    "strict": true,                    // strictNullChecks, useUnknownInCatchVariables, ...
    "noUncheckedIndexedAccess": true,  // arr[i] is T | undefined — bites on YOUR arrays
                                       //   (regex groups, split meta-row, argv), not cheerio
    "erasableSyntaxOnly": true,        // TS 5.8+ (NOT new in 6.0). Bans enum / namespaces /
                                       //   `import =` / constructor parameter-properties →
                                       //   forces idiomatic literal unions
    "verbatimModuleSyntax": true,      // makes `import type` load-bearing
    "noFallthroughCasesInSwitch": true,
    "outDir": "dist", "rootDir": "src",
    "declaration": true,               // we emit a library .d.ts too → M4/M9 lesson
    "skipLibCheck": true
  }
}
```
**M8 opt-in:** `exactOptionalPropertyTypes: true` — flipped late, at the *config layer*, where optional fields (`--out`, `--quiet`) make `prop?: T` vs `prop: T | undefined` concrete and the blast radius is one module. **Clean drop path = remove one line**; we write no code that depends on its semantics.

---

## Architecture — type boundaries = module boundaries

**Pure core, impure shell** (the biggest portfolio signal). Parsers are pure `(html: string) => T` with zero I/O, so they test trivially against saved fixtures. All network/browser/filesystem I/O lives at the edges. Every layer hands the next a *validated* type. The `Engine` interface is the seam where Playwright plugs in without touching parsers.

```
LearningTypeScript/
├─ src/
│  ├─ cli.ts                 # commander wiring: argv → validated Config (M8)
│  ├─ index.ts               # library entry (re-exports core; emits .d.ts)
│  ├─ config.ts              # Config type + zod-validated defaults (`satisfies`)
│  ├─ models/
│  │  ├─ job.ts              # JobListing, JobDetail, EnrichedJob (M1/M3/M6 → z.infer in M7)
│  │  └─ result.ts           # Result<T,E>, ok/err, assertNever (M3)
│  ├─ schema/job.schema.ts   # zod schemas; single source of truth from M7 on
│  ├─ parse/                 # PURE. (html) => T. No I/O. The testable seam.
│  │  ├─ listPage.ts         # parseSearchPage, parseJobHref guard, paginationCount
│  │  ├─ jobPage.ts          # microdata + data-careersite + meta-row + parseSapDate
│  │  ├─ helpers.ts          # stripFmd, normalizeUrl (NO entity-decode — cheerio owns that)
│  │  └─ robots.parse.ts     # PURE robots.txt parser: rules[] → isAllowed(path) (M8)
│  ├─ net/                   # IMPURE.
│  │  ├─ robots.ts           # fetch + cache robots.txt; delegates to parse/robots.parse.ts
│  │  ├─ fetchWithRetry.ts   # Promise<Result<string, FetchError>>; UA, AbortSignal.timeout,
│  │  │                      #   429/503 + Retry-After, backoff+jitter (M5)
│  │  └─ rateLimit.ts        # p-limit + min-delay politeness (M6)
│  ├─ engines/
│  │  ├─ Engine.ts           # interface ScrapeEngine — the contract / strategy seam
│  │  ├─ StaticEngine.ts     # fetch-based (default)
│  │  ├─ PlaywrightEngine.ts # OPTIONAL advanced fallback (M10)
│  │  └─ FakeEngine.ts       # fixture-backed, for hermetic pipeline tests (M9)
│  ├─ scrape/
│  │  ├─ scrapeListings.ts   # pagination loop (M5)
│  │  ├─ enrichDetails.ts    # bounded-concurrency detail fetch (M6)
│  │  └─ pipeline.ts         # list → validate → enrich → validate
│  ├─ output/writers.ts      # toJson / toCsv / toNdjson (M8)
│  ├─ util/collection.ts     # dedupeBy<T>, mapPool<T,R> (M6)
│  └─ errors.ts              # custom Error subclass hierarchy (M0/M3)
├─ test/
│  ├─ fixtures/              # REAL saved HTML: search-page.html, job-detail.html,
│  │                         #   edge-detail.html (missing date/short meta), robots.txt
│  └─ *.test.ts
├─ types/env.d.ts            # learner-authored ambient .d.ts (M8)
├─ .github/workflows/ci.yml  # M11
├─ eslint.config.js          # flat config (M8)
├─ tsconfig.json
├─ package.json
└─ README.md                 # grown incrementally from M3
```

**JS-vs-Python gotchas we pre-empt** (these bite a Python dev harder than type theory): ESM relative imports need explicit `.js` extensions even though the source is `.ts` (M0); `import type` vs `import` under `verbatimModuleSyntax` (M4, cheerio); **`__dirname` doesn't exist in ESM** — fixture loading uses `fileURLToPath(new URL('./fixtures/', import.meta.url))` (M5); `"type": "module"` in `package.json` (M0).

---

## Milestones (M0–M11)

**M0–M7 are the load-bearing spine** — every promised TS concept lands here. **M8–M11 are portfolio polish**; each ends in a shippable result. Difficulty ramps smoothly: build → static types → idiomatic errors → first real scrape & narrowing → async/transport failures → generics → **zod centerpiece** → product polish → advanced engine → CI.

### M0 — The build itself: erasure, strict, ESM
- **New TS:** the compile model (types are erased), `strict` + `noUncheckedIndexedAccess`, ESM `.js`-extension imports, `erasableSyntaxOnly` (TS 5.8+ — why no `enum`/namespaces/parameter-properties).
- **Demo:** create the M0 `tsconfig`, a typed `log.ts`; `npx tsc`; **open `dist/log.js`** and watch annotations vanish; add a type error → build fails.
- **DIY:** write `errors.ts` — a small `Error` subclass hierarchy (`ScrapeError`, `FetchError`, `ParseError`) using **explicit field declarations + constructor assignment** (NOT `constructor(private msg)` — `erasableSyntaxOnly` rejects parameter-properties; feel that error once, on purpose); add `config.ts` and hit + fix the missing-`.js`-extension import.
- **Done when:** `npm run build` emits `dist/`, `node dist/index.js` prints a banner, a type error fails the build, and you can explain why `dist` has no types.

### M1 — Inference & structural typing: the first `JobListing`
- **New TS:** type *inference* (don't annotate what TS knows), **structural/duck typing** (the big shift from Java's nominal `implements`), excess-property checks.
- **Demo:** `interface JobListing`; show the excess-property error on an object literal; show a function accepting *any* structurally-matching object with no `implements`.
- **DIY:** model `JobDetail`; write `type EnrichedJob = JobListing & { detail: JobDetail | null }`; justify interface-vs-type-alias in the README.
- **Done when:** a fixture object literal typechecks with zero casts; you can articulate why TS accepted a value Java would reject.

### M2 — tsx; unions & literal types; fetch one real page
- **New TS:** string-literal **union types** (`OutputFormat = "json" | "csv" | "ndjson"`, `EngineKind = "static" | "playwright"`) — used *because* `erasableSyntaxOnly` bans `enum`; `Promise<T>` + `async/await` typing; the first `unknown` in a `catch`.
- **Demo:** `npm i -D tsx`; switch the dev loop (**state: tsx does not type-check**); write `async fetchPage(url): Promise<string>` that GETs the live search URL and prints status + byte length.
- **DIY:** add the unions to `config.ts`; narrow `catch (e: unknown)` (forward-ref: we make this rigorous next milestone).
- **Done when (offline-checkable):** `npm run typecheck` passes (the real gate); **capture the first fixture now** — save the live search page to `test/fixtures/search-page.html`; gate is "fixture non-empty and `fetchPage` returns 200 when reachable" — never a hardcoded byte/row count (live `developer` query returns ~48 results).

### M3 — Discriminated unions & `never`: idiomatic errors
- **New TS:** **discriminated unions** + exhaustive `switch` + `never` (the idiomatic TS replacement for Java exceptions/`Optional`); `Result<T,E>`; optional chaining `?.` / nullish coalescing `??`. **Plus a 30-second "how to read `<T>`" aside** — you *consume* generics here and in M5 (`PromiseSettledResult<T>[]`) before *authoring* one in M6; reading `<T>` is a separate, earlier skill than writing it.
  ```ts
  type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
  const assertNever = (x: never): never => { throw new Error(`unreachable: ${JSON.stringify(x)}`); };
  // delete a case below → the param is no longer `never` → compile error. Exhaustiveness for free.
  ```
- **Demo:** write `Result<T,E>`, `ok()`, `err()`, `assertNever`; model `FetchOutcome` where a disallowed apply-URL is a `{ kind: "blocked" }` variant, not a thrown exception.
- **DIY:** convert M2's `catch` to return `Result<string, FetchError>`; add `?.`/`??` where parsed DOM may be absent.
- **Done when:** no `throw` for *expected* failures; removing a union case fails to compile.

### M4 — `any` (felt), then `unknown` vs `any` + narrowing/guards: the first real scrape (cheerio)
- **New TS:** **`unknown` vs `any`** — taught by *feeling `any`'s pain first, then reaching for `unknown`* — narrowing, user-defined **type guards** (`x is T`), and the `@types`/`.d.ts` *consumer* contrast (cheerio ships its own types; **do not** install deprecated `@types/cheerio`).
- **Demo (three precise beats):**
  1. **cheerio ESM imports** under `verbatimModuleSyntax`/`nodenext` (the likeliest time-sink): `import * as cheerio from "cheerio"` (value) + `import type { CheerioAPI } from "cheerio"` (type-only — required here).
  2. Write `parseJobHref` returning `any`, watch a typo (`.slugg`) compile and blow up at runtime, **then** fix with `unknown`/a guard so the typo becomes a compile error.
  3. **Be precise about which cheerio call yields `undefined`:** `$(el).text()` returns **`string`** and **already decodes HTML entities** (so `&amp;`/`&#39;` are handled — the title needs only `(f/m/d)` stripping, *no* hand-rolled entity decode). `$(el).attr("href")` returns **`string | undefined`** — *this* is the narrowing motivator. The href slug is **percent-encoded** (`%28fmd%29`) → `decodeURIComponent`, distinct from HTML-entity decoding.
  ```ts
  function parseJobHref(href: string | undefined) {
    if (href == null) return null;                       // narrow string | undefined → string
    const m = /\/job\/([^/]+)-(\d+)\/(\d+)\//.exec(href);
    if (!m) return null;
    const slug = decodeURIComponent(m[1] ?? "");         // percent-decode, NOT &amp; replace
    return { slug, reqId: m[2] ?? "", jobId: m[3] ?? "" };
  }
  ```
- **DIY:** add `.jobLocation` + `reqId`/`city` per `.data-row`; skip a malformed row via the `null` guard (don't throw); ensure no `any` in the scrape path.
- **Done when:** the saved fixture parses to its listings; a malformed row is skipped, not crashed; **first Vitest assertion lands here** — the pure parser + existing fixture make the "done count" a one-line test (`expect(parseSearchPage(html)).toHaveLength(n)`).

### M5 — Async/Promise typing + pagination + transport failures + ESM fixtures
- **New TS:** typing sequential `await`; the **real network-failure taxonomy** (transport lies too); **Vitest over pure parsers with saved fixtures**, including the **ESM fixture-loading gotcha**.
- **Demo:** promote `net/fetchWithRetry.ts` to real code — descriptive `User-Agent` (default node/undici UA gets 403'd — ethics *and* debugging), `AbortSignal.timeout(10_000)` (Node 22 idiom → `AbortError`), retry on 429/503 honoring `Retry-After`, backoff + jitter, `catch (e: unknown)` narrowing. Then `scrapeListings.ts` loops `?startrow=25,50,…` driven by `.paginationLabel`.
  ```ts
  // ESM: __dirname doesn't exist — load fixtures via import.meta.url
  const dir = fileURLToPath(new URL("./fixtures/", import.meta.url));
  const html = readFileSync(`${dir}search-page.html`, "utf8");   // (or Vitest's `?raw` import)
  ```
- **DIY:** parse the total-count text into a **derived page count / range, not brittle exact equality** (label may be `"1-25 of 312"` or localized; last page is partial); add `--max-pages`; write `helpers.test.ts` + a `fetchWithRetry` test driving a fake `fetch` returning `429 + Retry-After` and asserting one retry then success.
- **Done when:** `npm test` green offline (fixtures via `import.meta.url`); a broken parser fails a test; the retry test proves `Retry-After` is honored.

### M6 — Generics: bounded-concurrency enrichment + detail parsing
- **New TS:** **generics** with constraints — authored exactly when one helper must serve two models. `mapPool<T,R>(items, limit, fn)` is the *first generic you author* (after *reading* `Result<T,E>` and `PromiseSettledResult<T>[]`). `Promise.all` vs `allSettled` typing.
- **Demo:** `npm i p-limit`; write `parseJobDetail(html): JobDetail` (microdata `itemprop` + `data-careersite-propertyid` + split the pipe-delimited meta row into a `Record<string,string>` — **here `noUncheckedIndexedAccess` genuinely bites**: `parts[2]` is `string | undefined`); write `mapPool<T,R>` over p-limit; show inference filling `T`/`R`.
- **DIY:** write `enrichDetails.ts` using `mapPool` (concurrency 4, 250 ms min-delay, each fetch via `fetchWithRetry`) returning `EnrichedJob[]`; use `Promise.allSettled` so one failed detail → `detail: null`, not a sunk batch; generify `dedupeBy<T>` by `jobId`.
- **Done when:** the real set enriches with bounded concurrency, tolerates individual failures; `mapPool` is *reused* (not re-authored) for both models.

### M7 — ⭐ CENTERPIECE: compile-time vs runtime, with zod
- **New TS:** the compile/runtime gap made concrete; **zod + `z.infer` as single source of truth**; `safeParse` returning a discriminated result; `.transform()`/`.refine()`.
- **Demo:** `npm i zod`; write `JobListingSchema`, **delete the hand-written interface**, replace with `type JobListing = z.infer<typeof JobListingSchema>`. Run parser output through `safeParse`; feed wrong data, watch runtime rejection. **Parse the SAP date with an explicit transform** — note the *real* justification: `new Date("Sat May 09 02:00:00 UTC 2026")` actually *does* parse in V8, so the reason is **determinism/locale-independence + explicit rejection of malformed input** (`new Date("nope")` silently yields `Invalid Date`), *not* that Date "can't" parse it. Avoid `z.coerce.date()` for that reason. (zod v4: use top-level `z.url()`.)
- **DIY:** write `JobDetailSchema` (literal-union employment type + the date transform); infer `JobDetail`; write the pipeline step that splits validated records from **rejects-with-reasons**; add `edge-detail.html` (missing date, short meta) + **two date tests**: a valid date → correct UTC instant, and `"not a date"` → **rejected with a reason** (assert the rejection, not a silent `Invalid Date`).
- **Done when:** no duplicated shapes (types inferred from schemas); corrupted fixtures yield "N parsed, M rejected" with zero uncaught exceptions.

> **End of the load-bearing spine — every required TS concept is covered. M8–M11 are polish.**

### M8 — Product layer: robots gate, CLI UX, utility types, `.d.ts`, EOPT, lint
> **Explicitly splittable** (heaviest non-centerpiece). M8a = robots + CLI + config/EOPT; M8b = lint/format + writers + exit codes + `.d.ts`. A fast learner does it in one pass; splitting it is not "falling behind."
- **New TS:** **utility types** (`Partial`/`Pick`/`Omit`/`Record`/`Readonly`), `satisfies` (validate a defaults literal without widening), typed `argv` via commander, **`exactOptionalPropertyTypes`** (opt-in here), and **authoring a `.d.ts`** (the producer side of the declaration-files goal).
- **Demo:**
  1. **robots.txt as PARSE-then-MATCH, not a hardcoded allowlist.** Pure `parse/robots.parse.ts` reads the `User-agent: *` group's `Disallow` prefixes and applies **default-allow + longest-matching-`Disallow`-prefix wins** (jobs.sap.com has **no `Allow:` rules** — implementing "block unless `Allow` matches" wrongly blocks everything). Bake the verified `Disallow` set into `test/fixtures/robots.txt`. `net/robots.ts` fetches+caches and delegates; a disallowed URL → the `{ kind: "blocked" }` outcome from M3.
  2. **CLI:** hand-roll argv once, then replace with commander (`--query --location --max-pages --concurrency --format --out --quiet --engine`, auto `--help`/`--version`); validate into `Config` with zod; `const DEFAULTS = {...} satisfies Partial<Config>`.
  3. **`exactOptionalPropertyTypes`** flipped here (config layer); show the friction (`{ out: undefined }` not assignable to `{ out?: string }`), confirm the one-line drop path.
  4. **Author `types/env.d.ts`** (ambient declaration for env knobs like `SCRAPER_UA`/`LIVE`).
  5. ESLint flat config + typescript-eslint + prettier; fix the floating-promise it flags; ban `any`.
- **DIY:** implement `toCsv` (quote commas / `(f/m/d)` / `&`) + `toNdjson`; pick CSV columns via `Pick<JobDetail, ...>`; exit codes (0 ok / 1 runtime / 2 bad flags); `eslint .` to zero.
- **Done when:** a live command writes valid `jobs.json`/`jobs.csv`, `--help` works, bad flags exit 2, the robots parser (tested offline) allows `/search/`+`/job/` and blocks the disallowed prefixes, `npm run check` is green.

### M9 — The `Engine` interface seam + mocked pipeline tests
- **New TS:** **interfaces as contracts / strategy pattern**; DI via types; structural conformance (no `implements` needed); `vi.mock` for offline tests.
- **Demo:** extract `interface ScrapeEngine { fetchHtml(url): Promise<Result<string, FetchError>>; close?(): Promise<void> }`; make existing logic a `StaticEngine`; write a fixture-backed `FakeEngine`; write `pipeline.test.ts` driving list→validate→enrich with zero network.
- **DIY:** add a multi-page + one-failing-detail pipeline test; confirm `tsc` emits `index.d.ts` (consumer-facing output of `declaration: true`).
- **Done when:** behavior unchanged; full pipeline tests run offline; swapping engines is a one-line change.

### M10 — OPTIONAL/advanced: the Playwright engine behind the interface
> **Skippable by design.** ~300 MB browser download + flakiness + `await using` (explicit resource management) for a target that *doesn't need a browser*. A fast learner can ship a portfolio-grade result without it; the M9 seam is itself the evidence you *could* add it.
- **New TS (if attempted):** consuming a large typed third-party API; async resource lifecycle (`try/finally` or `await using`); the payoff — *same parsers, same schemas, different source*.
- **Demo:** `npm i playwright`; `PlaywrightEngine implements ScrapeEngine` (chromium → `page.content()` → cleanup in `finally`); `--engine playwright`; diff output vs `--engine static`.
- **DIY:** add `--wait-for <selector>`; one **smoke test** that returned HTML contains `.data-row`.
- **Done when:** `--engine playwright` matches `--engine static`, never leaks a browser, **parsers reused unchanged**.

### M11 — Portfolio finish: README + GitHub Actions CI
- **New TS:** none — packaging the engineering story.
- **Demo:** finalize the README (grown since M3) as a **tight** pitch — load-bearing sections only: (1) spine-thesis opener, (2) pure-core/impure-shell diagram, (3) dependency-thesis table, (4) short strictness rationale (`noUncheckedIndexedAccess`, the EOPT decision + drop path), (5) robots ethics + descriptive-UA note. Write `ci.yml` (Node 20/22 matrix, `npm ci`, `npm run check`, build, cache).
- **DIY:** add coverage + README badge; mark live-network tests `skipIf(!process.env.LIVE)` so they **never gate CI** (CI stays hermetic on fixtures); PR a type error, watch CI fail, fix it.
- **Done when:** a stranger can `git clone` → `npm i` → `npm run check` → run the tool in <5 min from the README; a type error fails CI.

---

## Verification — end-to-end against jobs.sap.com

Run after M8 (full product) and again after M10 (engine parity, *only if you did M10*):
1. **Build & gates:** `npm run check` → typecheck + lint + tests green offline (zero network in tests).
2. **Live smoke (static):** `npm run dev -- --query "developer" --location "Berlin Potsdam" --max-pages 2 --format json --out jobs.json` → progress indicator, then `jobs.json` with a plausible set of `EnrichedJob` records (count tracks the live set — today ~48, not fixed), each a `JobListing` plus a validated `detail` or `detail: null` with a logged reason.
3. **Validation bite:** garble a fixture date → reported in the "M rejected" tally with a reason; no uncaught exception; `"not a date"` rejected, never silently `Invalid Date`.
4. **Robots compliance:** point the parser at `test/fixtures/robots.txt`; confirm `/search/`+`/job/` allowed by *absence* of a Disallow and disallowed prefixes (`/talentcommunity/`, `/applybutton/`, `/services/`, …) blocked; live run hits only `/search/` and `/job/`, refuses the apply CTA as a `blocked` outcome.
5. **Transport resilience:** unit test proves `fetchWithRetry` honors `Retry-After` on 429 and surfaces a timeout (`AbortError`) as a `FetchError` (caught as `unknown`, narrowed) — not a crash; live run sends the descriptive UA.
6. **Pagination sanity:** printed total consistent with `?startrow` page math (range/derived, not brittle exact match).
7. **CLI UX:** `--help` lists all flags; a bad flag exits 2; `--format csv` correctly quotes commas/`(f/m/d)`/`&`.
8. **Engine parity (OPTIONAL — only if M10 done):** `--engine playwright` ≈ `--engine static`; no leaked chromium.
9. **CI:** push a branch → Actions runs `npm run check` on Node 20 & 22; a deliberate type error fails the run.

Steps 1–7 + 9 are the portfolio baseline; step 8 is optional. All attempted steps passing ⇒ the tool works end-to-end and the repo is portfolio-ready.

---

## What happens when we exit plan mode

I'll start **M0**: scaffold `package.json` (ESM), install `typescript`, write the M0 `tsconfig` + a tiny typed file, and walk you through the `tsc` → `dist/` erasure demo. Then I hand you the M0 DIY (`errors.ts` hierarchy) and review it before we move to M1. We proceed milestone by milestone at your pace — I demo, you implement, I review.
