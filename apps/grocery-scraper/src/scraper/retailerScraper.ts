import { Config } from "@grocery-tracker/utils";
import { Category, Product, Retailer } from "@grocery-tracker/domain-model";

export abstract class RetailerScraper {
  protected abstract retailerUrl : string;
  readonly abstract retailerName: Retailer["name"];
  constructor(protected readonly config: Config) {
  }

  abstract discoverCategories(): Promise<Category[]>;

  abstract scrapeProductsOfCategory(category: Category) : AsyncGenerator<Product>;

  abstract close(): Promise<void>;
}
