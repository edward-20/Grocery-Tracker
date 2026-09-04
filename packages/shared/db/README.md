# Description
This internal package is only for use within this monorepo, that is it will not
be published. It has two dual purposes.

1. Provide the repository classes, types, interfaces and helpful functions,
   which are built using the build tool (tsup) and consumed by other packages
within this monorepo.
2. To spin up a local postgres (with timescaledb) database instance for whatever
   use (currently to be run in conjunction with the frontend dev runtime) that
can be populated with realistic data.

In order to fulfill purpose 2, an environment file (`.env`) must be placed in
the root of the monorepo with the following variables:
`HOST`
`DATABASE`
`USER`
`PASSWORD`
`PORT`

## Scripts and Lifecycle
`pnpm dev` is for the first purpose, in that it provides a temporary build.

`pnpm start`, `pnpm stop`, `pnpm reset`, `pnpm seed`, `pnpm snapshot` all
pertain to the second purpose.

`start` starts a timescaledb enabled postgres container. it will be the same
given you provide the same `.env` at the root.

`reset` removes all existing schemas and data, and resets the schema to the last
written migration (in our case the last written migration is pretty much the
latest version of the database).

`seed` finds and uses sql files that populate the latest version database schema
with data. They are sourced from `seed/<last-migration-number>/<date>.sql` with
the latest date being used by default.

At this point you are free to make further data changes to the database, after
which you can run `snapshot:data` which will capture that data into a sql file
and save it as a seed file. **You must manually remove the INSERT into retailers
from this seed file or change it to be idempotent. This is a kludge and will be
fixed in later versions of this package.**

`stop` will stop the postgres container. The volume will be the same and so
if you didn't write a migration file that represents the latest change to the
database, the schema of the database will not be in sync with your
`migrations/`.

## Migrations and Seeds
Migrations written in postgresql should be committed to the `/migrations`
directory and named as `<number>.migration.sql` in ascending order.

## Seed Data
Files of the form `seed/<number>/<date>.sql` indicate that up to migration
`<number>`, any of those seed files will work.

# Future Plans
* Implement `pnpm snapshot:schema` or `gen:migration` to automatically generate a
sql file which captures the schema diff between the current live postgres container and
the latest version (tools such as migra or sqitch may be useful)
* make `isInitialised` better implemented to match what the latest version
states the schema is
