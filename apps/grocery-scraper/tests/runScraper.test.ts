import { describe, expect, it } from "vitest";
import { isBrowserCrash } from "../src/scraper/runScraper.js";

describe("isBrowserCrash", () => {
  it.each([
    "locator.isVisible: Target crashed",
    "page.goto: Page crashed",
  ])("recognises Playwright crash errors: %s", (message) => {
    expect(isBrowserCrash(new Error(message))).toBe(true);
  });

  it("recognises a crash wrapped with diagnostic context", () => {
    const crash = new Error("locator.isVisible: Target crashed");
    const contextualError = new Error("Woolworths scrape failed for Pantry", { cause: crash });

    expect(isBrowserCrash(contextualError)).toBe(true);
  });

  it.each([
    "locator.isVisible: strict mode violation",
    "page.goto: Timeout 45000ms exceeded",
    "Target page, context or browser has been closed",
  ])("does not classify non-crash Playwright errors: %s", (message) => {
    expect(isBrowserCrash(new Error(message))).toBe(false);
  });
});
