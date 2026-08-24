type RetailerName = "Woolworths" | "Coles";

// config
export interface RetailerScrapeConfig {
  name: RetailerName;
  enabled: boolean;
  url: string;
}

export interface ScraperConfig {
  database: {
    host: string,
    port: number,
    database: string,
    user: string,
    password: string
  };
  schedule: {
    cron: string;
  };
  browser: {
    headless: boolean;
  };
  scrape: {
    throttleBetweenPagesMs: number;
    navigationTimeoutMs: number;
  };
  retailers: RetailerScrapeConfig[];
}
