import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Browser, Page, BrowserContext } from "playwright";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import { ColesScraper } from "../src/scraper/colesScraper.js";
import { readFile } from "fs/promises";
import { sleep } from "../src/utils/time.js";
import { Category } from "@grocery-tracker/domain-model";
import { ScraperConfig } from "../src/config/types.js";
import { initDbSchema } from "@grocery-tracker/db";

const expectedCategoriesUnparsed = await readFile("tests/fixtures/coles/parsed/coles-parsed-categories.json", "utf-8");
const expectedCategories: Category[] = await JSON.parse(expectedCategoriesUnparsed);
const scraperConfig: ScraperConfig = {
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
  },
  retailers: [
    {
      name: "Woolworths",
      enabled: true,
      url: "https://woolworths.com.au"
    },
    {
      name: "Coles",
      enabled: true,
      url: "https://coles.com.au"
    }
  ],
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

afterAll(async () => {
  await container.stop();
})

describe("ColesScraper", () => {
  let scraper: ColesScraper;
  let browser: Browser;
  let browserContext: BrowserContext
  let testPage: Page;

  beforeEach(async (context) => {
    if (context.task.name === "parses the categories payload") { return; }

    chromium.use(StealthPlugin());
    browser = await chromium.launch({ headless: false });
    browserContext = await browser.newContext({
      locale: "en-AU",
      timezoneId: "Australia/Sydney",
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 }
    })
    testPage = await browserContext.newPage();

    scraper = await ColesScraper.create(scraperConfig, browser);

  }, 0)

  it("parses the categories payload", async () => {
    browser = await chromium.launch({ headless: false });
    const createContextMockedWithCategories = async (browser: Browser): Promise<BrowserContext>  => {
      browser = await chromium.launch({ headless: false });
      browserContext = await browser.newContext({
        locale: "en-AU",
        timezoneId: "Australia/Sydney",
        userAgent:
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 720 }
      })
      // the main page's categories payload is mocked
      const mockCategoriesPayload = await readFile('tests/fixtures/coles/raw/coles-categories-payload.txt', 'utf-8');
      await browserContext.route("https://www.coles.com.au/_next/data/20260702.2-cdcde970c50768337017410cc7320816bc2580c8/en/browse.json", route => {
        route.fulfill({
          body: mockCategoriesPayload,
          contentType: "application/json",
          status: 200
        })
      })
      // also need to mock the API version
      const mockNextData = await readFile('tests/fixtures/coles/raw/next-data.html');
      await browserContext.route("https://www.coles.com.au", route => {
        route.fulfill({
          body: `
  <html>
    <head></head>
    <body>
      ${mockNextData}
    </body>
  </html>
  `,
          contentType: "text/html",
          status: 200
        })
      })
      return browserContext;
    }

    scraper = await ColesScraper.create(scraperConfig, browser, createContextMockedWithCategories);

    const receivedCategories: Category[] = await scraper.discoverCategories();
    const expectedCategoriesUnparsed = await readFile("tests/fixtures/coles/parsed/coles-parsed-categories.json", "utf-8");
    const expectedCategories: Category[] = await JSON.parse(expectedCategoriesUnparsed);
    // order doesn't matter in the array (order it by something)
    receivedCategories.sort((a, b) => a.name.localeCompare(b.name));
    expectedCategories.sort((a, b) => a.name.localeCompare(b.name));

    expect(receivedCategories).toEqual(expectedCategories);
  });

  it("discovers the categories correctly on 13/07/2026", async () => {
    const receivedCategories: Category[] = await scraper.discoverCategories();
    // order doesn't matter in the array (order it by something)
    receivedCategories.sort((a, b) => a.name.localeCompare(b.name));
    expectedCategories.sort((a, b) => a.name.localeCompare(b.name));

    expect(receivedCategories).toEqual(expectedCategories);
  });

  it.each(expectedCategories)(`scrape products of category: $name with a valid image url`, async (category: Category) => {
    for await (const product of scraper.scrapeProductsOfCategory(category)) {
      // check that the product image url leads to a real image url
      if (!product.imageUrl) {
        continue;
      }
      const response = await testPage.goto(product.imageUrl);
      expect(response?.status()).toEqual(200);
      // have to check we didn't get scrape checked
      await sleep(500);
    }
  })

  afterEach(async () => {
    await testPage?.close();
    await browserContext?.close();
    await browser.close();
  }, 0)

}, 0);
