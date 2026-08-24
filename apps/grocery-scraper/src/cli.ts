import { loadConfig } from "./config/loadConfig.js";
import { makeConnectionPool } from "./db/createPool.js";
import { select, input, confirm } from "@inquirer/prompts";
import { WoolworthsScraper } from "./scraper/woolworthsScraper.js";
import { RetailerScraper } from "./scraper/retailerScraper.js";
import { PostgresCategoryRepository, PostgresProductRepository } from "./db/postgresRepository.js";
import { CategoryRepository, ProductRepository } from "./db/repository.js";
import { ColesScraper } from "./scraper/colesScraper.js";

const config = loadConfig(process.env.SCRAPER_CONFIG);
const pool = makeConnectionPool();

const action = await select({
  message: "Which retailer?",
  choices: [
    {
      name: "Woolworths",
      value: "Woolworths",
    },
    {
      name: "Coles",
      value: "Coles",
    }
  ],
});

let scraper: RetailerScraper;

if (action === "Woolworths") {
  // woolworths scraper
  scraper = await WoolworthsScraper.create(config);
} else {
  scraper = await ColesScraper.create(config);
}

const categories = await scraper.discoverCategories();

const selectedCategory = await select({
  message: "Which category?",
  choices: categories.map((category) => {
    return {
      name: category.name,
      value: category.name
    }
  })
});

console.log(`Scraping ${action}: ${selectedCategory}`);

try {
  const categoryRepository: CategoryRepository = new PostgresCategoryRepository(pool);

  const category = categories.find((c) => c.name === selectedCategory);
  if (!category) {
    throw new Error("Something went wrong when trying to find the category");
  }

  const writtenCategory = await categoryRepository.createOrUpdate(category);

  const productRepository: ProductRepository = new PostgresProductRepository(pool);

  for await (const product of scraper.scrapeProductsOfCategory(writtenCategory)) {
    try {
      await productRepository.createOrUpdate(product);
    } catch (error) {
      console.error(`Failed to create/update product ${product.name}`);
    }
  }
} catch (error) {
  console.error(`Fatal Error: couldn't run scrape. ${error}`);
} finally {
  await scraper.close();
  await pool.end();
}
