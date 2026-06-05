// src/errors.ts

// Base class for every error this scraper throws. Extending the built-in Error
// works cleanly at target es2023 (no `Object.setPrototypeOf` hack needed — ignore
// the StackOverflow answers that add one; those are for old ES5 targets).
export class ScrapeError extends Error {
  // ⚠️ THE TRAP: you cannot write `constructor(public url: string)` here.
  // `erasableSyntaxOnly` bans constructor *parameter properties* (they emit runtime
  // code, so they aren't "just erasable types"). Declare the field explicitly...
  readonly url: string;

  constructor(message: string, url: string) {
    super(message);
    this.name = "ScrapeError"; // so `console.log(err)` prints "ScrapeError: ..." not "Error: ..."
    this.url = url;            // ...and assign it in the body.
  }
}

export class FetchError extends ScrapeError {
    readonly statusCode?: number;   // present on an HTTP error (404/503); absent on a timeout

    constructor(message : string, url: string, statusCode? : number) {
        super(message, url);
        this.statusCode = statusCode;
        this.name = "FetchError";
    }

}

export class ParseError extends ScrapeError {
    readonly selector: string;
    constructor(message : string, url: string, selector : string) {
        super(message, url);
        this.selector = selector;
        this.name = "ParseError";
    }

}