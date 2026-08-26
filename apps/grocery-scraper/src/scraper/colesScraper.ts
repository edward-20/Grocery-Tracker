import { RetailerScraper } from "./retailerScraper.js";
import * as z from "zod";
import { Browser, BrowserContext, chromium } from "playwright";
import { sleep } from "../utils/time.js";
import { Page } from "playwright";
import { ScraperConfig } from "../config/types.js";
import { Category, Product, Retailer, UnitOfMeasurement, ValueAtTime } from "@grocery-tracker/domain-model";

const ColesCategoriesPayload = z.object({
  pageProps: z.object({
    allProductCategories: z.object({
      catalogGroupView: z.array(z.object({
        id: z.string(),
        name: z.string(),
        seoToken: z.string()
      }))
    })
  })
});

const ColesProductUnit = z.object({
  _type: z.union([z.literal("PRODUCT"), z.literal("PRODUCT_ASSOCIATION")]),
  id: z.number(),
  name: z.string(),
  brand: z.string(),
  description: z.string(),
  size: z.string(),
  imageUris: z.array(z.object({
    uri: z.string(),
  })),
  pricing: z.object({
    now: z.number(),
    unit: z.union([
      z.object({
        quantity: z.number(),
        ofMeasureQuantity: z.number(),
        ofMeasureUnits: z.string(),
        price: z.number(),
        ofMeasureType: z.string(),
      }),
      z.object({
      })
    ]),
    comparable: z.string().optional()
  }).nullable(),
});

type ColesProductUnitNonNullablePricing =
  Omit<z.infer<typeof ColesProductUnit>, "pricing"> & {
    pricing: NonNullable<z.infer<typeof ColesProductUnit>["pricing"]>;
  };

const ColesProductPageUnit = z.discriminatedUnion("_type", [
  ColesProductUnit,
  z.object({
    _type: z.literal("SINGLE_TILE")
  }),
  z.object({
    _type: z.literal("CONTENT_ASSOCIATION")
  })
]);

const ColesProductsPagePayload = z.object({
  pageProps: z.object({
    searchResults: z.object({
      results: z.array(ColesProductPageUnit)
    })
  })
})

export class ColesScraper extends RetailerScraper {
  readonly retailerUrl = "https://www.coles.com.au"
  readonly retailerName: Retailer["name"] = "Coles";
  private apiVersion: string = "";
  
  private constructor(config: ScraperConfig, private browser: Browser, private context: BrowserContext) {
    super(config);
  }

  static async create(config: ScraperConfig, browser?: Browser, createContext?: (browser: Browser) => Promise<BrowserContext>) {
    // if there's no browser supplied to the factory function
    if (!browser) {
      browser = await chromium.launch({ headless: config.browser.headless });
    }
    let context: BrowserContext;
    if (!createContext) {
      context = await browser.newContext({
        locale: "en-AU",
        timezoneId: "Australia/Sydney",
        userAgent:
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 720 },
      });
      context.setDefaultNavigationTimeout(config.scrape.navigationTimeoutMs);
    } else {
      context = await createContext(browser);
    }
    return new ColesScraper(config, browser, context);
  }

  private async getAPIVersion(): Promise<string> {
    const page = await this.context.newPage();

    try {
      await page.goto(this.retailerUrl);
      const script = page.locator("script#__NEXT_DATA__");
      const contents = await script.textContent({ timeout: 60_000});
      // parse the contents and get the API version
      const nextDataPayload = z.object({
        buildId: z.string()
      })
      const contentsJSONParsed = JSON.parse(contents ?? "");
      const parsedContents = nextDataPayload.parse(contentsJSONParsed);
      return parsedContents.buildId;
    } finally {
      await page.close();
    }
  }

  async discoverCategories(): Promise<Category[]> {
    this.apiVersion = await this.getAPIVersion();

    const page = await this.context.newPage();
    const response = await page.goto(`${this.retailerUrl}/_next/data/${this.apiVersion}/en/browse.json`);

    const json = await response?.json();
    const categories = this.parseCategoriesJSON(json);

    await page.close()
    return categories;
  }

  private genImagePath(productId: number) {
    const productIdString = productId.toString();
    return `https://shop.coles.com.au/wcsstore/Coles-CAS/images/${productIdString[0]}/${productIdString[1]}/${productIdString[2]}/${productIdString}-zm.jpg`;
  }

  private normaliseUnitOfMeasurement(uom: string): UnitOfMeasurement {
    switch (uom) {
      case "ea": return "Each";
      case "g": return "g";
      case "kg": return "Kg";
      case "l": return "L";
      case "L": return "L";
      case "M": return "m";
      case "ml": return "mL";
      case "mL": return "mL";
      case "kgM": return "kgM";
      default: throw new Error(`Couldn't convert to standardised unit of measurement ${uom}`);
    }
  }

  private normaliseColesProductUnitNonNullablePricing(product: ColesProductUnitNonNullablePricing, category: Category): Product {
    const unitPricing = product.pricing.comparable?.match(/^\$(\d+(?:\.\d+)?)\/\s*(\d+(?:\.\d+)?)([a-zA-Z]+)$/);
    // precondition: if there's no match there's no unit pricing
    return new Product({
      retailer: "Coles",
      retailerProductId: product.id.toString(),
      category,
      currentValue: !unitPricing ? 
        new ValueAtTime(
          product.size,
          product.pricing.now,
          new Date()
        ) : 
        new ValueAtTime(
          product.size,
          product.pricing.now,
          new Date(),
          {
            unitPrice: Number(unitPricing[1]),
            unitPriceQuantity: Number(unitPricing[2]),
            unitPriceUnitofMeasurement: this.normaliseUnitOfMeasurement(unitPricing[3]),
          }
        ),
      name: product.name,
      path: "",
      description: product.description,
      brand: product.brand,
      imageUrl: this.genImagePath(product.id),
    })
  }

  private parseProductPageJSON(categoriesJSON: JSON, category: Category): Product[] {
    const payload = ColesProductsPagePayload.parse(categoriesJSON);
    return payload.pageProps.searchResults.results
      .filter((tile): tile is z.infer<typeof ColesProductUnit> => tile._type !== "SINGLE_TILE" && tile._type !== "CONTENT_ASSOCIATION")
      .filter((productUnit): productUnit is ColesProductUnitNonNullablePricing => {
        return productUnit.pricing !== null
      })
      .map(product => this.normaliseColesProductUnitNonNullablePricing(product, category));
  }

  private parseCategoriesJSON(categoriesJSON: JSON): Category[] {
    const payload = ColesCategoriesPayload.parse(categoriesJSON);
    return payload.pageProps.allProductCategories.catalogGroupView.map(catalog => ({
      retailerDesignatedCategoryId: catalog.id,
      name: catalog.name,
      path: `/browse/${catalog.seoToken}`,
      retailer: "Coles"
    }));
  }

  private async getProductPageData(page: Page, category: Category, pageNumber?: number): Promise<Product[]> {
    const pageNumberQuery = pageNumber ? `?page=${pageNumber}` : "";
    console.log(`${this.retailerUrl}/_next/data/${this.apiVersion}${category.path}.json${pageNumberQuery}`);
    const productPagePayload = await page.goto(`${this.retailerUrl}/_next/data/${this.apiVersion}${category.path}.json${pageNumberQuery}`);

    const productPageJSON: JSON | null = await productPagePayload?.json();
    if (productPageJSON === null) {
      throw new Error(`Couldn't parse the first page of the Coles category: ${category.name}`);
    }
    return this.parseProductPageJSON(productPageJSON, category);
  }

  async *scrapeProductsOfCategory(category: Category) : AsyncGenerator<Product> {
    if (this.apiVersion === "") {
      this.apiVersion = await this.getAPIVersion();
    }
    await sleep(5_000);
    const page = await this.context.newPage();
    // go to the api to get product page data for the first page
    for (const product of await this.getProductPageData(page, category)) {
      yield product;
    }

    let pageNumber = 2; 
    while (true) {
        await sleep(this.config.scrape.throttleBetweenPagesMs);
        // get the api
        const parsedProductsOfPage = await this.getProductPageData(page, category, pageNumber);
        for (const product of parsedProductsOfPage) {
          yield product;
        }
        if (parsedProductsOfPage.length === 0) {
          return;
        }
        pageNumber++;
    }
  }

  async close() {
    await this.context.close();
    await this.browser.close();
  }

}
