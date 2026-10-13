# Description
Grocery Tracker monorepo. 
Two app packages:
* `@grocery-tracker/scraper`: a node-cron process to scrape Australian
Grocery store websites
* `@grocery-tracker/frontend`: a Sveltekit frontend to display data
Internal packages :
* `@grocery-tracker/domain-model`: a library providing types and classes
representing the entities that are dealt with in the apps and other internal
packages
* `@grocery-tracker/db`: a library providing repository classes and relevant
  utilities
* `@grocery-tracker/utils`: a library providing utilities

# Development Mode
Development mode boots up:
* `packages/shared/db` dev mode which is a postgres container as well as watches
  the library source files
* `apps/frontend` dev mode which is Vite dev mode
You may optionally run:
* `apps/grocery-scraper` with `pnpm singleRun`, `pnpm cli` or `pnpm worker`.
The grocery-scraper app has no defined dev mode, as it is not an app that can be
developed with a quick feedback loop, as a singular scrape takes hours.
* `packages/shared/*` libraries watched for changes

For more information on the respective development modes, look to each packages'
`README.md`.

## .env
In order for development mode to provide a local dev postgres container for
the apps, have a `.env` file with `CONFIG_PATH` path to a yml file containing
configurations for the database, schedule of the scraper (not relevant to dev
mode), browser headless mode flag, scrape timing config and retailer
configurations.

Have each package of the monorepo supply an env file with a path to their
desired `config.yaml`. In my development workflow, I elected to have a root
`config.yaml` which was referred to by all env files.

## Config Schema
```
database:
  host: 'localhost'
  port: 5433
  database: 'groceries-dev'
  user: 'dev'
  password: 'dev'
  max: 5

schedule:
  cron: "0 3 * * *"

browser:
  headless: false

scrape:
  throttleBetweenPagesMs: 5000
  navigationTimeoutMs: 45000
  notifiedEmail: "fakemail@email.com"

retailers:
  - name: Woolworths
    enabled: true
    retriesPerCategory: 3
  - name: Coles
    enabled: true
    retriesPerCategory: 3

resend:
  apiKey: resendApiKey

domain: somedomain.com
```
`database` tells of the database configuration, refer to `PoolConfig` on [this type documentation](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/pg/index.d.ts)

`schedule.cron` uses cron syntax

`browser.headless` dictates whether you wish to run playwright in headless mode
or not (advised to not run in headless for more successful scrapes)

`scrape`:
* `throttleBetweenPagesMs` is the time in ms between scraping pages
* `throttleBetweenPagesMs` is the time in ms before playwright gives up on a
redirect
* `notifiedEmail` tells of which email is sent to detailing the results of a
scrape

`retailers`: gives the config of the retailers (leave mostly as is except
`retriesPerCategory` which tells of how many times an attempt should be made on
a category of a retailer before giving up)

`resend.apiKey` is the api key for the transactional email service resend, used
to email results of scrapes

`domain` is the domain owned by you for the transactional email service and for
the frontend in production

# Deployment 
## Release images
Publishing a GitHub release runs `.github/workflows/publish-images.yml`, which
builds and pushes these Docker Hub images:

- `<DOCKERHUB_USERNAME>/grocery-tracker-frontend`
- `<DOCKERHUB_USERNAME>/grocery-tracker-scraper`

Before publishing the first release, add these repository settings in GitHub:

- Actions variable: `DOCKERHUB_USERNAME` (the Docker Hub user or organisation)
- Actions secret: `DOCKERHUB_TOKEN` (a Docker Hub access token with push access)

Each image receives the release tag and a `sha-<commit>` tag. Stable releases
also receive `latest`; prereleases do not.

## Requirements for images to work
The frontend image is for a node process, that is a frontend server. Like
development mode it requires a `.env` file with a path to `CONFIG_PATH`.

The scraper image is also a node process that is a cron job running a scrape at
a rate configured by the scraper config. It also requires the `.env` file with a
path to `CONFIG_PATH`.

## Continuous Deployment (WIP)
The deployment process is:
1. Cut a release
2. Github actions build and push images to your docker hub repository.
3. Your production server pulls in these images and redeploys. Note that your
   production server must supply an `.env` file with `CONFIG_PATH` path to a
   `config.yaml` for these images to run.

[For my personal deployment of this project](ausgroceriescomparison.store), I
have elected to run a docker compose with the following services and images.

|service   	|image   	|
|scraper	|<DOCKERHUB_USERNAME>/grocery-tracker-scraper	|
|frontend   	|<DOCKERHUB_USERNAME>/grocery-tracker-frontend   	|
|database   	|timescale/timescaledb:latest-pg17 |
|watchtower   	|containrrr/watchtower   	|

The watchtower watches for pushes to the container registries and pulls them in
immediately.

The database volume requires the `schema.sql` in order to be inited. There is
currently no mechanism for migration, refer to Future Plans.

I have also used `xvfb` to create a virtual display server for the scraper
(running in headed mode) to connect to.

# Future Plans
* Turborepo potentially for better DX and monorepo features such as ordered
building of packages. 
* Continuously deploying schema and data migrations.

With that being said, these will be implemented when the problem arises.
Currently DX is not a concern, and the need to change the database schema hasn't
presented itself.

## Version 2
* Github workflow pushing images with a tag identifying that the image is
  preproduction
* preproduction server as closely configured to the same settings as the
production server as possible, where manual checks to the frontend can be conducted and
  a single run of the scraper is conducted to see what issues arise
* frontend has a page displaying the scrape statistics of the latest scrape run 
