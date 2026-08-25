import { ScraperConfig } from "../config/types.js";
import { Category, Product, Retailer } from "@grocery-tracker/domain-model";

export abstract class RetailerScraper {
  protected abstract retailerUrl : string;
  readonly abstract retailerName: Retailer["name"];
  constructor(protected readonly config: ScraperConfig) {
  }

  abstract discoverCategories(): Promise<Category[]>;

  abstract scrapeProductsOfCategory(category: Category) : AsyncGenerator<Product>;

  abstract close(): Promise<void>;
}
