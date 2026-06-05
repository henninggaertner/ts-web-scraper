// M0 MENTOR DEMO — the entry point.
//
// Note the import path ends in ".js", even though the file on disk is "log.ts".
// Under ESM ("type": "module" + moduleResolution: nodenext), you import the path of the
// EMITTED file (log.js), not the source (log.ts). This trips up almost everyone coming
// from Python/Node-CJS. TypeScript checks `./log.js` against `src/log.ts` for you.
import { log } from "./log.js";
import { FetchError, ParseError, ScrapeError } from  "./errors.js";

const err = new FetchError("Failed to retrieve page content", "sap.jobs.com", 404);
if (err instanceof ScrapeError){
    throw (err);

}


log("SAP jobs scraper — M0 build works.", { level: "info", withTimestamp: true });
log("Types are a compile-time fiction; the emitted JS carries none of them.", { level: "info" });
