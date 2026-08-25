import { ScraperConfig } from "../config/types.js";
import { ColesScraper } from "./colesScraper.js";
import { WoolworthsScraper } from "./woolworthsScraper.js";
import { RetailerScraper } from "./retailerScraper.js";
import { ProductRepository } from "../db/repository.js";
import { Category, Retailer } from "@grocery-tracker/domain-model";
import { Pool } from "pg";
import { PostgresCategoryRepository, PostgresProductRepository, PostgresRetailerRepository } from "../db/postgresRepository.js";
import { shuffle } from "../utils/shuffle.js";

export async function runScrape(config: ScraperConfig, pool: Pool): Promise<{ errors: number, productsScraped: number }> {
  
  const scrapeResults = { errors: 0, productsScraped: 0 };
  const retailerRepository = new PostgresRetailerRepository(pool);
  for (const retailer of config.retailers.filter((candidate) => candidate.enabled)) {
    try {
      retailerRepository.createOrUpdate(retailer);
      const retailerScrapeResults = await runRetailerScrape(retailer.name, config, pool);
      scrapeResults.errors += retailerScrapeResults.errors;
      scrapeResults.productsScraped += retailerScrapeResults.productsScraped;
    } catch (error) {
      console.error(`Non fatal error occurred in scraping of ${retailer.name}, continuing to next retailer.`);
      console.error(error);
      scrapeResults.errors += 1;
    }
  }
  return scrapeResults;
}

async function runRetailerScrape(
  retailer: Retailer["name"],
  config: ScraperConfig,
  pool: Pool
): Promise<{ errors: number, productsScraped: number }> {

  const retailerScrapeResults = { errors: 0, productsScraped: 0 };
  let retailerScraper: RetailerScraper;
  switch (retailer) {
    case "Coles" :
      retailerScraper = await ColesScraper.create(config);
      break;
    case "Woolworths" :
      retailerScraper = await WoolworthsScraper.create(config);
      break;
    default:
      throw new Error(`Undefined Retailer for Retailer Scraper creation: ${retailer}`);
  } 

  let categories: Category[];
  try {
    categories = await retailerScraper.discoverCategories();
  } catch (error) {
    console.error(`Error occured: Couldn't get the categories of ${retailer}.`);
    console.error(error);
    retailerScrapeResults.errors += 1;
    await retailerScraper.close();
    return retailerScrapeResults;
  }

  const categoryRepository = new PostgresCategoryRepository(pool);
  const shuffledCategories = shuffle(categories);
  for (const category of shuffledCategories)  {
    try {
      const createdCategory = await categoryRepository.createOrUpdate(category);
      const categoryScrapeResults = await runCategoryScrape(createdCategory, retailerScraper, pool);
      retailerScrapeResults.errors += categoryScrapeResults.errors;
      retailerScrapeResults.productsScraped += categoryScrapeResults.productsScraped;
    } catch (error) {
      console.error(`Non fatal error occurred in scraping of ${category.name}, continuing to next category.`);
      console.error(error);
      retailerScrapeResults.errors += 1;
    }
  }
  retailerScraper.close();

  return retailerScrapeResults;
}

async function runCategoryScrape(
  category: Category,
  retailerScraper: RetailerScraper,
  pool: Pool
): Promise<{errors: number, productsScraped: number}> {

  const categoryScrapeResults = { errors: 0, productsScraped: 0 };

  const productRepository: ProductRepository = new PostgresProductRepository(pool);
  for await (const product of retailerScraper.scrapeProductsOfCategory(category)) {
    try {
      await productRepository.createOrUpdate(product);
      categoryScrapeResults.productsScraped += 1;
    } catch (error) {
      console.error(`Non fatal error occurred in writing product ${product.name}. Continuing onto next product`);
      console.error(error);
      categoryScrapeResults.errors += 1;
    }
  };

  return categoryScrapeResults;
}
