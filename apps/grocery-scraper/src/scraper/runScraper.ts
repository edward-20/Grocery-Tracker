import { Config, getCurrentTimeInSydney, sendEmail } from "@grocery-tracker/utils";
import { ColesScraper } from "./colesScraper.js";
import { WoolworthsScraper } from "./woolworthsScraper.js";
import { RetailerScraper } from "./retailerScraper.js";
import { Category, Retailer } from "@grocery-tracker/domain-model";
import { Pool } from "pg";
import { ProductRepository, PostgresCategoryRepository, PostgresProductRepository, PostgresRetailerRepository } from "@grocery-tracker/db";
import { shuffle } from "../utils/shuffle.js";
import { Resend } from "resend";

export async function runScrape(config: Config, pool: Pool, resend: Resend): Promise<{ errors: number, productsScraped: number }> {
  const scrapeResults = { errors: 0, productsScraped: 0 };
  const retailerRepository = new PostgresRetailerRepository(pool);
  for (const retailer of config.retailers.filter((candidate) => candidate.enabled)) {
    try {
      retailerRepository.createOrUpdate(retailer);
      const retailerScrapeResults = await runRetailerScrape(retailer, config, pool, resend);
      scrapeResults.errors += retailerScrapeResults.errors;
      scrapeResults.productsScraped += retailerScrapeResults.productsScraped;
    } catch (error) {
      console.error(`Fatal error occurred in scraping of ${retailer.name}:`);
      console.error(error);
      const now = getCurrentTimeInSydney();
      try {
        sendEmail(
          `${now}: Failed ${retailer.name} Scrape`,
          `Fatal error occurred in scraping of ${retailer.name}\n${error instanceof Error ? error.toString() : String(error)}`,
          config.scrape.notifiedEmail,
          config.domain,
          resend
        );
      } catch (error) {
        console.error(`Couldn't send an email notifying of ${retailer.name} scrape failure`);
      }
      scrapeResults.errors += 1;
    }
  }
  return scrapeResults;
}

async function runRetailerScrape(
  retailer: Config["retailers"][number],
  config: Config,
  pool: Pool,
  resend: Resend
): Promise<{ errors: number, productsScraped: number }> {

  const retailerScrapeResults = { errors: 0, productsScraped: 0 };
  let retailerScraper = await createRetailerScraper(retailer.name, config);

  try {
    let categories: Category[];
    try {
      categories = await retailerScraper.discoverCategories();
    } catch (error) {
      retailerScrapeResults.errors += 1;
      throw new Error(`Couldn't get the categories of ${retailer.name}`, { cause: error });
    }

    const categoryRepository = new PostgresCategoryRepository(pool);
    for (const category of shuffle(categories))  {
      let retries = 0;
      while (true) {
        try {
          const createdCategory = await categoryRepository.createOrUpdate(category);
          const categoryScrapeResults = await runCategoryScrape(createdCategory, retailerScraper, pool);
          retailerScrapeResults.errors += categoryScrapeResults.errors;
          retailerScrapeResults.productsScraped += categoryScrapeResults.productsScraped;
          break;
        } catch (error) {
          if (retries >= retailer.retriesPerCategory || !isBrowserCrash(error)) {
            let errorMessage = "";
            if (retries >= retailer.retriesPerCategory) {
              errorMessage = `Fatal error occurred in scraping of ${category.retailer}:${category.name}, crashed after ${retries} retries.`;
            } else {
              errorMessage = `Fatal error occurred in scraping of ${category.retailer}:${category.name}`;
            }
            console.error(errorMessage);
            console.error(error);
            try {
              const now = getCurrentTimeInSydney();
              sendEmail(
                `${now}: Failed ${retailer.name}:${category.name} Scrape`,
                `${errorMessage}\n${error instanceof Error ? error.toString() : String(error)}`,
                config.scrape.notifiedEmail,
                config.domain,
                resend
              );
            } catch (error) {
              console.error(`Couldn't send an email notifying of ${retailer.name} scrape failure`);
            }
          } else {
            retries += 1;
            console.warn(
              `Browser crashed while scraping ${category.name}; restarting it and retrying ` +
              `(${retries}/${retailer.retriesPerCategory}).`,
            );
            await closeScraper(retailerScraper);
            retailerScraper = await createRetailerScraper(retailer.name, config);
            continue;
          }
        }
      }
    }
    return retailerScrapeResults;
  } finally {
    await closeScraper(retailerScraper);
  }
}

async function createRetailerScraper(retailer: Retailer["name"], config: Config): Promise<RetailerScraper> {
  switch (retailer) {
    case "Coles": return ColesScraper.create(config);
    case "Woolworths": return WoolworthsScraper.create(config);
  }
}

function isBrowserCrash(error: unknown): boolean {
  return error instanceof Error && /page crashed/i.test(error.message);
}

async function closeScraper(scraper: RetailerScraper): Promise<void> {
  try {
    await scraper.close();
  } catch (error) {
    // A crashed browser is already gone; closing its context can fail too.
    if (!isBrowserCrash(error)) {
      console.warn("Couldn't cleanly close scraper after use.");
      console.warn(error);
    }
  }
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
