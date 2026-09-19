import { makeConnectionPool, initDbSchema, isInitialised } from "@grocery-tracker/db";
import { loadConfig } from "@grocery-tracker/utils";
import { runScrape } from "./scraper/runScraper.js";

const config = loadConfig(process.env.CONFIG_PATH);
const pool = makeConnectionPool(config.database);

try {
  const initialisedStatus = await isInitialised(config.database);
  if (initialisedStatus.status === "not-initialised") {
    initDbSchema(config.database);
  } else if (initialisedStatus.status === "broken") {
    throw new Error("Database is broken");
  }
  console.log("Beginning singular scrape")
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
