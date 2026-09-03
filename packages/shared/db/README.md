# Description
This internal package is only for use within this monorepo, that is it will not
be published. It has two dual purposes.

1. Provide the repository classes, types, interfaces and helpful functions,
   which are built using the build tool (tsup) and consumed by other packages
within this monorepo.
2. To spin up a local postgres (with timescaledb) database instance for whatever
   use (currently to be run in conjunction with the frontend dev runtime).

In order to fulfill purpose 2, an environment file (`.env`) must be placed in
the root of the monorepo with the following variables:
`DB`
`USER`
`PASSWORD`
`PORT`
