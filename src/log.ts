// M0 MENTOR DEMO — "what survives compilation, and what evaporates?"
//
// Everything in this file that is a *type* is a compile-time-only fiction.
// After `npx tsc`, open dist/log.js and you'll see it has been deleted entirely.
// Only the *runtime* code (ICONS, the function body, console.log) remains.

/** The levels we allow. At RUNTIME this is just a string; the union only constrains the COMPILER. */
export type LogLevel = "info" | "warn" | "error";

/** An interface is pure compile-time metadata. It emits NOTHING to dist/ — zero bytes. */
export interface LogOptions {
  level: LogLevel;
  withTimestamp?: boolean; // the `?` makes this optional — `boolean | undefined`
}

// A real runtime value. `Record<LogLevel, string>` is a mapped object type with EXACTLY the three
// keys above, so indexing it by a `LogLevel` returns `string` (NOT `string | undefined`) even under
// noUncheckedIndexedAccess — that flag only fires on open-ended index signatures and arrays.
const ICONS: Record<LogLevel, string> = {
  info: "•",
  warn: "!",
  error: "✗",
};

/** A typed function. The `: string`, `: LogOptions`, and `: void` annotations all vanish in dist/. */
export function log(message: string, options: LogOptions): void {
  const prefix = options.withTimestamp ? `[${new Date().toISOString()}] ` : "";
  console.log(`${prefix}${ICONS[options.level]} ${message}`);
}
