import { makeConnectionPool } from "@grocery-tracker/db";
import { loadConfig } from "./config/loadConfig.js";
import { runScrape } from "./scraper/runScraper.js";

const config = loadConfig(process.env.SCRAPER_CONFIG);
const pool = makeConnectionPool();

try {
  const summary = await runScrape(config, pool);
  console.log(
    `Scheduled scrape complete: ${summary.productsScraped} scanned product(s), ` +
      `${summary.errors} error(s).`,
  );
} catch (error) {
  console.error(`Fatal Error: couldn't run scrape. ${error}`)
} finally {
  await pool.end();
}
