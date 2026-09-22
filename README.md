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
* `packages/shared/db` dev mode which is a postgres container
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

Example:
```
database:
  host: 'localhost'
  port: 5433
  database: 'groceries-dev'
  user: 'dev'
  password: 'dev'

schedule:
  cron: "0 3 * * *"

browser:
  headless: false

scrape:
  throttleBetweenPagesMs: 5000
  navigationTimeoutMs: 45000

retailers:
  - name: Woolworths
    enabled: true
    retriesPerCategory: 3
    productByProduct: false
  - name: Coles
    enabled: true
    retriesPerCategory: 3
    productByProduct: false
```
Have each package of the monorepo supply an env file with a path to their
desired `config.yaml`. In my development workflow, I elected to have a root
`config.yaml` which was referred to by all env files.

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
