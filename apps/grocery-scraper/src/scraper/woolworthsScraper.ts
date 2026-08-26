import { RetailerScraper } from "./retailerScraper.js";
import { chromium, Browser, Page, BrowserContext } from "playwright";
import { sleep } from "../utils/time.js";
import * as z from "zod";

import { Category, Product, ValueAtTime, Retailer, UnitOfMeasurement } from "@grocery-tracker/domain-model";
import { ScraperConfig } from "../config/types.js";

const WoolworthsCategoriesPayload = z.object({
  Categories: z.array(z.object({
    NodeId: z.string(), // maps to retailerDesignatedCategoryId
    Description: z.string(),  // maps to name
    UrlFriendlyName: z.string(),
  }))
})

export const WoolworthsProductsPagePayload = z.object({
  Bundles: z.array(z.object({
    Products: z.array(z.discriminatedUnion("HasCupPrice", [
      z.object({
        // product specific
        // retailerProductId, crossRetailerId, gtinFormat, currentValueId, name,
        // brand, path, description, image_url
        Stockcode: z.number(),
        Barcode: z.string().nullable(),
        GtinFormat: z.union([z.literal(0), z.literal(8), z.literal(12), z.literal(13), z.literal(14)]),
        DisplayName: z.string(),              // name
        Brand: z.string().nullable(),             // brand
        Description: z.string(),       // description
        UrlFriendlyName: z.string(),
        MediumImageFile: z.string(),

        // value_at_time specific
        // unit_price, unit_price_quantity, 
        // unit_price_unit_of_measurement, size, price
        HasCupPrice: z.literal(true),
        CupPrice: z.number(),          // value_at_time: unitPrice
        CupMeasure: z.string().nullable(),        // "10g" value_at_time: unitPriceQuantity + unitPriceMeasureQuantity
        CupString: z.string(),
        PackageSize: z.string(),       // "80g" value_at_time: sizeQuantity
        Price: z.number().nullable(),  // When its null it means the product can't be bought, skip scrape
      }),
      z.object({
        Stockcode: z.number(),
        Barcode: z.string().nullable(),
        GtinFormat: z.union([z.literal(0), z.literal(8), z.literal(12), z.literal(13), z.literal(14)]),
        DisplayName: z.string(),              // name
        Brand: z.string().nullable(),             // brand
        Description: z.string(),       // description
        UrlFriendlyName: z.string(),
        MediumImageFile: z.string(),

        HasCupPrice: z.literal(false),
        Price: z.number().nullable(),             // WHY????
        PackageSize: z.string(),       // "80g" value_at_time: sizeQuantity
      }),
    ])),
  }))
})

export class WoolworthsScraper extends RetailerScraper {
  protected retailerUrl = "https://www.woolworths.com.au"
  readonly retailerName: Retailer["name"] = "Woolworths";

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
        viewport: { width: 1280, height: 720 }
      });
      context.setDefaultNavigationTimeout(config.scrape.navigationTimeoutMs);
    } else {
      context = await createContext(browser);
    }
    return new WoolworthsScraper(config, browser, context);
  }

  async discoverCategories(): Promise<Category[]> {
    const page = await this.context.newPage();
    try {
      const response = await page.goto(`${this.retailerUrl}/apis/ui/PiesCategoriesWithSpecials`, {
        waitUntil: "load"
      });

      const json = await response?.json();
      const categories = this.parseCategoriesJSON(json);
      return categories.filter(category => category.retailerDesignatedCategoryId !== "1_A363395" && category.retailerDesignatedCategoryId !== "1_B63CF9E" && category.retailerDesignatedCategoryId !== "1_B863F57" && category.retailerDesignatedCategoryId !== "specialsgroup"); 
    } finally {
      page.close();
    }
  }

  getFulfilledResponse(page: Page) {
    return page.waitForResponse(`${this.retailerUrl}/apis/ui/browse/category`);
  }

  async *scrapeProductsOfCategory(category: Category) : AsyncGenerator<Product> {
    const page = await this.context.newPage();

    try {
      let productPageResponse = this.getFulfilledResponse(page);

      await page.goto(`${this.retailerUrl}${category.path}`);

      let response = await productPageResponse;
      let rawData = await response?.json();
      for (const product of this.parseProductsPageJSON(rawData, category)) {
        yield product;
      }

      while (true) {
        const nextLink = page.locator('a[rel="next"]');
        await sleep(this.config.scrape.throttleBetweenPagesMs);

        // Stop if no next button or disabled
        if (!(await nextLink.isVisible()) || await nextLink.isDisabled()) {
          break;
        }
        await nextLink.scrollIntoViewIfNeeded();

        // Start waiting BEFORE clicking
        let productPageResponse = this.getFulfilledResponse(page);

        await sleep(3000);
        await nextLink.click();
        await sleep(5000);

        // This resolves when the click triggers the API request
        response = await productPageResponse;
        rawData = await response?.json();

        for (const product of this.parseProductsPageJSON(rawData, category)) {
          yield product;
        }
      }
    } finally {
      page.close();
    }
  }

  private parseCategoriesJSON(json: JSON) : Category[] {
    const payload = WoolworthsCategoriesPayload.parse(json);

    return payload.Categories.map((category) => ({
      retailerDesignatedCategoryId: category.NodeId,
      name: category.Description,
      path: `/shop/browse/${category.UrlFriendlyName}`,
      retailer: "Woolworths"
    }))
  }

  private parseRawUnit(rawUnit: string) : UnitOfMeasurement {
    switch(rawUnit) {
      case "EA":
        return "Each";
      case "KG":
        return "Kg";
      case "G":
        return "g";
      case "ML":
        return "mL";
      case "L":
        return "L";
      case "sheets":
        return "sheets";
      case "M":
        return "m";
      default: 
        throw Error(`Couldn't parse the raw unit string: ${rawUnit}`);
    }
  }

  private parseProductsPageJSON(json: JSON, category: Category) : Product[] {
    const productsPayload = WoolworthsProductsPagePayload.parse(json);
    const bundles = productsPayload.Bundles;


    return bundles
      .map(bundle => bundle.Products[0])
      .filter(product => product.Price !== null && product.Price !== undefined)
      .map(product => {
        let result: Product;
        if (product.HasCupPrice) {
          if (product.CupMeasure === null) {
            result = new Product({
              retailer: "Woolworths",
              retailerProductId: product.Stockcode.toString(),
              category,
              currentValue: new ValueAtTime(
                product.PackageSize,
                product.Price as number,
                new Date()
              ), 
              name: product.DisplayName,
              path: `/shop/productdetails/${product.Stockcode}/${product.UrlFriendlyName}`, // needs adjustment
              description: product.Description,
              brand: product.Brand ?? "",
              imageUrl: product.MediumImageFile,
              crossProductIdentity: product.Barcode ? {
                crossRetailerId: product.Barcode,
                gtinFormat: product.GtinFormat
              } : undefined
            })
          } else {
            let unitPriceQuantityMatch = product.CupMeasure.match(/^[0-9]+/);
            let unitPriceUnitMatch = product.CupMeasure.match(/^([0-9]+)([\s]*)([A-Za-z]+)/);

            let unitPriceQuantity = unitPriceQuantityMatch === null ? 0 : Number(unitPriceQuantityMatch[0]);
            let unitPriceUnit: Unit = this.parseRawUnit(unitPriceUnitMatch === null ? "" : unitPriceUnitMatch[3]) ;


            result = new Product({
              retailer: "Woolworths",
              retailerProductId: product.Stockcode.toString(),
              category,
              currentValue: new ValueAtTime(
                product.PackageSize,
                product.Price as number,
                new Date(),
                {
                  unitPrice: product.CupPrice,
                  unitPriceQuantity: unitPriceQuantity,
                  unitPriceUnitofMeasurement: unitPriceUnit,
                }
              ), 
              name: product.DisplayName,
              path: `/shop/productdetails/${product.Stockcode}/${product.UrlFriendlyName}`, // needs adjustment
              description: product.Description,
              brand: product.Brand ?? "",
              imageUrl: product.MediumImageFile,
              crossProductIdentity: product.Barcode ? {
                crossRetailerId: product.Barcode,
                gtinFormat: product.GtinFormat
              } : undefined
            })
          }


        } else {
          result = new Product({
            retailer: "Woolworths",
            retailerProductId: product.Stockcode.toString(),
            category,
            currentValue: new ValueAtTime(
              product.PackageSize,
              product.Price as number,
              new Date()
            ), 
            name: product.DisplayName,
            path: `/shop/productdetails/${product.Stockcode}/${product.UrlFriendlyName}`, // needs adjustment
            description: product.Description,
            brand: product.Brand ?? "",
            imageUrl: product.MediumImageFile,
            crossProductIdentity: product.Barcode ? {
              crossRetailerId: product.Barcode,
              gtinFormat: product.GtinFormat
            } : undefined
          });
        }
        return result;
      })
  }

  async close() {
    await this.context.close();
    await this.browser.close();
  }

}

