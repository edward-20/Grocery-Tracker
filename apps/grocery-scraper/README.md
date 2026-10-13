# grocery-scraper
TypeScript scraper application for Woolworths and Coles product pages. It uses
Playwright to discover categories from configured retailers and goes through the
categories scraping the products of each page.

## Developing
As said in the root `README.md`, there is no defined development lifecycle as
its hard to attain a good feedback loop based on a scrape which can take several
hours. That being said, you can run it locally for development (without the typical
watch modes you might see with frontend development or other apps), however will
require a Postgres connection. Create a Create a `.env` file in this
package with `CONFIG_PATH` which is a path to a yml file containing configs for
the database amongst other things. Refer to the monorepo's root `README.md`.

It would be best to run `cli`, as this provides a TUI for you to run a
particular category scrape of a retailer.

## Commands

```sh
pnpm worker # start a cron based worker
pnpm singleRun # do a single run
pnpm cli # boot up the cli to choose which retailer and category
pnpm test
pnpm typecheck
```

# Future Plans
* implement a github action for the monorepo that pushes an image of this app
which will run on a preproduction server (refer to root `README.md`)
* IGA scraper
* Foodworks scraper
