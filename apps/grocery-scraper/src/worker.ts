import cron from "node-cron";
import { getCurrentTimeInSydney, loadConfig, sendEmail } from "@grocery-tracker/utils";
import { makeConnectionPool, isInitialised, initDbSchema } from "@grocery-tracker/db";
import { runScrape } from "./scraper/runScraper.js";
import { Resend } from "resend";

const config = loadConfig(process.env.CONFIG_PATH);

if (!cron.validate(config.schedule.cron)) {
  throw new Error(`Invalid cron expression: ${config.schedule.cron}`);
}

let running = false;
let shuttingDown = false;

const resend = new Resend(config.resend.apiKey);

async function runScheduledScrape(): Promise<void> {
  if (running) {
    console.warn("Skipping scrape because a previous run is still active.");
    return;
  }

  running = true;
  const pool = makeConnectionPool(config.database);

  try {
    const initialisedStatus = await isInitialised(config.database);
    if (initialisedStatus.status === "not-initialised") {
      initDbSchema(config.database);
    } else if (initialisedStatus.status === "broken") {
      throw new Error("Database is broken");
    }
    const summary = await runScrape(config, pool, resend);
    const message = `Scheduled scrape complete: ${summary.productsScraped} scanned product(s), ` +
        `${summary.errors} error(s).`;
    console.log(message);

    try {
      const now = getCurrentTimeInSydney();
      await sendEmail(
        `${now} scrape results`,
        message,
        config.scrape.notifiedEmail,
        config.domain,
        resend
      )
    } catch (error) {
      console.error("Couldn't send notification email");
    }
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
