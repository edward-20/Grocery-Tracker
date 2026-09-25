import { beforeAll, describe, expect, it, } from "vitest";
import { Browser } from "playwright";
import { chromium } from "playwright-extra";
import { WoolworthsScraper } from "../src/scraper/woolworthsScraper.js";
import { readFile } from "fs/promises";
import { Category } from "@grocery-tracker/domain-model";
import { Config } from "@grocery-tracker/utils";
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { initDbSchema } from "@grocery-tracker/db";
import { Config } from "@grocery-tracker/utils";

const scraperConfig: Config = {
  database: {
    host: "localhost",
    port: 5433,
    database: "groceries",
    user: "test",
    password: "test"
  },
  schedule: {
    cron: "",
  },
  browser: {
    headless: false,
  },
  scrape: {
    throttleBetweenPagesMs: 5000,
    navigationTimeoutMs: 20000,
    notifiedEmail: "fake@email.com"
  },
  retailers: [
    {
      name: "Woolworths",
      enabled: true,
      url: "https://woolworths.com.au",
      retriesPerCategory: 3
    },
    {
      name: "Coles",
      enabled: true,
      url: "https://coles.com.au",
      retriesPerCategory: 3
    }
  ],
  resend: {
    apiKey: "fake"
  },
  domain: "fake"
}

let container: Awaited<
  ReturnType<PostgreSqlContainer["start"]>
>;

beforeAll(async () => {
  container = await new PostgreSqlContainer("timescale/timescaledb:latest-pg16")
  .withDatabase(scraperConfig.database.database)
  .withUsername(scraperConfig.database.user)
  .withPassword(scraperConfig.database.password)
  .start();

  initDbSchema({
    host: container.getHost(),
    port: container.getMappedPort(5432),
    database: container.getDatabase(),
    user: container.getUsername(),
    password: container.getPassword(),
  });
}, 0)

describe("WoolworthsScraper", () => {
  it("parses the categories payload", async () => {
    chromium.use(StealthPlugin());
    const browser = await chromium.launch({ headless: false });
    const createContext = async (browser: Browser) => {
      const browserContext = await browser.newContext({
        locale: "en-AU",
        timezoneId: "Australia/Sydney",
        userAgent:
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 720 }
      })
      const mockCategoriesPayload = await readFile('tests/fixtures/woolworths/raw/woolworths-categories-payload.json', 'utf-8');

      await browserContext.route("https://www.woolworths.com.au/apis/ui/PiesCategoriesWithSpecials", route => {
        route.fulfill({
          body: mockCategoriesPayload,
          contentType: "application/json",
          status: 200
        })
      })
      return browserContext;
    }
    const scraper = await WoolworthsScraper.create(scraperConfig, browser, createContext);

    const receivedCategories: Category[] = await scraper.discoverCategories();
    const expectedCategoriesUnparsed = await readFile("tests/fixtures/woolworths/parsed/woolworths-parsed-categories.json", "utf-8");
    const expectedCategories: Category[] = await JSON.parse(expectedCategoriesUnparsed);
    // order doesn't matter in the array (order it by something)
    receivedCategories.sort((a, b) => a.name.localeCompare(b.name));
    expectedCategories.sort((a, b) => a.name.localeCompare(b.name));

    expect(receivedCategories).toEqual(expectedCategories);
  });

  it("discovers the categories correctly on 18/06/2026", async () => {
    chromium.use(StealthPlugin());
    const browser = await chromium.launch({ headless: false });
    const scraper = await WoolworthsScraper.create(scraperConfig, browser);
    const receivedCategories: Category[] = await scraper.discoverCategories();
    const expectedCategoriesUnparsed = await readFile("tests/fixtures/woolworths/parsed/woolworths-parsed-categories.json", "utf-8");
    const expectedCategories: Category[] = await JSON.parse(expectedCategoriesUnparsed);
    // order doesn't matter in the array (order it by something)
    receivedCategories.sort((a, b) => a.name.localeCompare(b.name));
    expectedCategories.sort((a, b) => a.name.localeCompare(b.name));

    expect(receivedCategories).toEqual(expectedCategories);
  });

}, 0);
