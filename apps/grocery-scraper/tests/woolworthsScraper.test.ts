import { describe, expect, it, } from "vitest";
import { Browser } from "playwright";
import { chromium } from "playwright-extra";
import { WoolworthsScraper } from "../src/scraper/woolworthsScraper.js";
import { readFile, readdir } from "fs/promises";
import { Category, Product } from "@grocery-tracker/domain-model";
import { ScraperConfig } from "../src/config/types.js";
import StealthPlugin from "puppeteer-extra-plugin-stealth"

const rawFixturePath = "tests/fixtures/woolworths/raw";
const parsedFixturePath = "tests/fixtures/woolworths/parsed";
const rawFixtureFiles = await readdir(rawFixturePath);
const parsedFixtureFiles = await readdir(parsedFixturePath);

// categories: find all unique category names from the fixtures directory
const categories = [
  ...new Set(
    rawFixtureFiles.map(file =>
      file.replace(/(?:-\d+)?\.json$/, "")
    )
  )
].filter(category => category !== "woolworths-categories-payload");


const scraperConfig: ScraperConfig = {
  database: {
    host: "",
    port: 0,
    database: "",
    user: "",
    password: ""
  },
  schedule: {
    cron: "",
  },
  browser: {
    headless: false,
  },
  scrape: {
    throttleMs: 1000,
    navigationTimeoutMs: 1000,
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
describe("WoolworthsScraper", () => {
  // beforeEach(async (context) => {
  //   if (context.task.name === "parses the categories payload") { return; }

  //   chromium.use(StealthPlugin());
  //   browser = await chromium.launch({ headless: false });
  //   browserContext = await browser.newContext({
  //     locale: "en-AU",
  //     timezoneId: "Australia/Sydney",
  //     userAgent:
  //       "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  //     viewport: { width: 1280, height: 720 }
  //   })
  //   testPage = await browserContext.newPage();

  //   scraper = await WoolworthsScraper.create(scraperConfig, browser);

  // }, 0)

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

  it.skip("discovers the categories correctly on 18/06/2026", async () => {
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

  // for each category
  it.each(categories)("testing scrapeProductsOfCategory: %s", async (categoryName) => {
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

    const categoryRawFixtureFiles = rawFixtureFiles.filter(rawFixtureFile => rawFixtureFile.includes(categoryName));
    let rawPayloads: string[] = [];
    for (const categoryRawFixtureFile of categoryRawFixtureFiles) {
      rawPayloads.push(await readFile(`${rawFixturePath}/${categoryRawFixtureFile}`, "utf-8"));
    }
    await browserContext.route("https://www.woolworths.com.au/apis/ui/browse/category", async route => {
      await route.fulfill({
        body: rawPayloads.length > 0 ? rawPayloads.shift() : `{
          "Bundles": []
        }`,
        contentType: "application/json",
        status: 200
      })
    });
      return browserContext;
    }

    const scraper = await WoolworthsScraper.create(scraperConfig, browser, createContext);
    // derive the raw and parsed fixture name from categoryName
    const categoryParsedFixtureFiles = parsedFixtureFiles.filter(parsedFixtureFile => parsedFixtureFile.includes(categoryName));


    let parsedPayloads: string[] = [];
    for (const categoryParsedFixtureFile of categoryParsedFixtureFiles) {
      parsedPayloads.push(await readFile(`${parsedFixturePath}/${categoryParsedFixtureFile}`, "utf-8"));
    }
    
    const category: Category = {
      retailer: "Woolworths",
      retailerDesignatedCategoryId: categoryName, // not correct, but for the purpose of testing will be fine
      name: categoryName,
      path: `/shop/browse/${categoryName}`,
    };

    const receivedProducts = await scraper.scrapeProductsOfCategory(category);
    const expectedProducts: Product[] = parsedPayloads.map(parsedPayload => JSON.parse(parsedPayload)).flat();

    expectedProducts.sort((a, b) => a.retailerProductId.localeCompare(b.retailerProductId));
    receivedProducts.sort((a, b) => a.retailerProductId.localeCompare(b.retailerProductId));

    expect(receivedProducts, `scrape of ${categoryName} to match its corresponding fixture files`).toEqual(expectedProducts);
  })

}, 0);
