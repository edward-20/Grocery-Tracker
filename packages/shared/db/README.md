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

## Scripts
`pnpm dev` is for the first purpose, in that it provides a temporary build.

`pnpm start`, `pnpm stop`, `pnpm reset`, `pnpm seed`, all pertain to the second
purpose.

## Migrations and Seeds
Migrations written in postgresql should be committed to the `/migrations`
directory and named as `<number>.migration.sql` in ascending order.

## Seed Data
Files of the form `seed/<number>/<name>.sql` indicate that up to migration
`<number>`, those seed files will work.
