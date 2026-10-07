import { makeConnectionPool, initDbSchema, isInitialised } from "@grocery-tracker/db";
import { getCurrentTimeInSydney, loadConfig, sendEmail } from "@grocery-tracker/utils";
import { runScrape } from "./scraper/runScraper.js";
import { Resend } from "resend";

const config = loadConfig(process.env.CONFIG_PATH);
const pool = makeConnectionPool(config.database);
const resend = new Resend(config.resend.apiKey);

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
}
