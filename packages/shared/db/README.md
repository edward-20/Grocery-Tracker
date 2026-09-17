# Description
This internal package is only for use within this monorepo, that is it will not
be published. It has two dual purposes.

1. Provide the repository classes, types, interfaces and helpful functions,
   which are built using the build tool (tsup) and consumed by other packages
within this monorepo.
2. To spin up a local postgres (with timescaledb) database instance for
   **development mode**.

In order to fulfill purpose 2, an environment file (`.env`) must be placed in
the root of the monorepo with the variable: `CONFIG_PATH` with database
configuration.

## Scripts and Lifecycle
`pnpm dev` is for the first purpose, in that it provides a temporary build.

`pnpm start`, `pnpm stop`, `pnpm destroy`, `pnpm reset`, `pnpm seed`, `pnpm
gen:seed`, `pnpm gen:migration` all pertain to the second purpose.

`start` starts a timescaledb enabled postgres container. It will be the same
given you provide the same `.env` at the root. It will use the last saved
volume.

`destroy` removes the volume and stops the container.

`start` again.

`reset` initialises the volume with the base schema.

`seed` finds and uses sql files that populate the latest version database schema
with data. They are sourced from `seed/<last-migration-number>/<date>.sql` with
the latest date being used by default.

At this point you are free to make further data changes to the database, after
which you can run `gen:seed` which will capture that data into a sql file
and save it as a seed file.

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
* Implement `gen:migration` to automatically generate a sql file which captures
the schema diff between the current live postgres container and the latest
version (tools such as migra or sqitch may be useful)
* make `isInitialised` better implemented to match what the latest version
states the schema is
