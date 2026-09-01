# grocery-scraper

TypeScript scraper application for Woolworths and Coles product pages. It uses Playwright to discover categories from configured retailers and goes through the categories scraping the products of each page.

## Configuration

Edit `config/scraper.yaml`.

- `schedule.cron` is required for the worker.
- `retailers[].targets[]` controls the search/category URLs to scrape.

## Commands

```sh
pnpm worker # start a worker
pnpm singleRun # do a single run
pnpm cli # boot up the cli to choose which retailer and category
pnpm test
pnpm typecheck
```

Use a different config file with:

```sh
SCRAPER_CONFIG=config/other.yaml pnpm scrape:once
```
