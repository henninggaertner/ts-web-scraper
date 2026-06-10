import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { parsePaginationCount } from "../src/parse/listPage.js";

const html = readFileSync(
  fileURLToPath(new URL("./fixtures/search-page.html", import.meta.url)),
  "utf8",
);

describe("parsePaginationCount", () => {
  it("extracts the correct listing number", () => {
    const pagination_count = parsePaginationCount(html);
    expect(pagination_count).toBeDefined();
    expect(pagination_count).toBe(53);
  });
  it("returns null on invalid input", () => {
    const pagination_count = parsePaginationCount("");
    expect(pagination_count).toBeNull();
  })
});
