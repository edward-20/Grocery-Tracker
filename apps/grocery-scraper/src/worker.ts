import cron from "node-cron";
import { loadConfig } from "./config/loadConfig.js";
import { makeConnectionPool } from "@grocery-tracker/db";
import { runScrape } from "./scraper/runScraper.js";

const config = loadConfig(process.env.SCRAPER_CONFIG);

if (!cron.validate(config.schedule.cron)) {
  throw new Error(`Invalid cron expression: ${config.schedule.cron}`);
}

let running = false;
let shuttingDown = false;

async function runScheduledScrape(): Promise<void> {
  if (running) {
    console.warn("Skipping scrape because a previous run is still active.");
    return;
  }

  running = true;
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
    running = false;
  }
}

const task = cron.schedule(config.schedule.cron, () => {
  void runScheduledScrape();
});

console.log(`Grocery scraper worker scheduled with cron: ${config.schedule.cron}`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    task.stop();
    console.log(`Received ${signal}; stopping grocery scraper worker.`);
    process.exit(0);
  });
}
