// src/models/result.ts
// M3 MENTOR DEMO — Result<T,E>: the idiomatic TS way to handle EXPECTED failures
// without throwing. (Throwing is for *bugs* and truly exceptional cases; a 404 or a
// robots-blocked URL is an expected, modellable outcome — so we return it as data.)

/**
 * A DISCRIMINATED UNION. The shared literal field `ok` is the "discriminant":
 * the moment you check `result.ok`, TypeScript NARROWS to one branch and knows
 * exactly which other fields exist (`value` vs `error`). Think Rust's Result / Haskell's Either.
 *
 *   Result<string, FetchError>  reads as: "succeeds with a string, or fails with a FetchError".
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

/**
 * Constructors. `ok<T>(value): Result<T, never>` — the `never` for E means "this can be
 * a Result with ANY error type", so `ok(html)` slots into a `Result<string, FetchError>`
 * without complaint (`never` is assignable to everything). Same idea, mirrored, for `err`.
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Exhaustiveness helper. Its parameter is typed `never`, so you can ONLY call it with a
 * value the compiler has already narrowed away to nothing. Put it in a `switch`'s `default`:
 * if you later add a case to the union and forget to handle it, the leftover type is no
 * longer `never`, and THIS call stops compiling. The compiler nags you so you don't have to.
 */
export function assertNever(x: never): never {
  throw new Error(`unreachable variant: ${JSON.stringify(x)}`);
}
