# About
This is the frontend of an Australian grocery price tracker. Currently it
reports the prices of Woolworths and Coles products with the possibility of more
in the future.

## Technologies and Libraries in Use
```
SvelteKit and Svelte (SSR)
vitest

```

# How to work on this project
1. Create a branch following the naming convention `<type>/<name>` where `type`
   where type is any of:
```
[
  'fix',
  'feat',
  'build',
  'chore',
  'ci',
  'docs',
  'feat',
  'fix',
  'perf',
  'refactor',
  'revert',
  'style',
  'test'
];
```
2. This project requires TDD, so any new `feat`, requires testing for it.

This project supports agentic development workflows. Currently only supports
opencode, but other version controlled files may appear in the future to support
other agentic development tools.
To recreate this project with the same configuration:

```sh
# recreate this project
npx sv create --template minimal --types ts --add prettier eslint tailwindcss="plugins:typography,forms" --install npm Grocery_Comparison
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

# branch naming conventions follow 
lowercase, kebab case.
## InfluxDB Cloud Serverless

This app queries with **SQL** via `@influxdata/influxdb3-client` (same idea as `client.query(sql, 'YourDb')` in the official getting started guide).

Set **`INFLUXDB_DATABASE`** to your **database name** in Cloud (e.g. `Groc`) — the same name you pass as the second argument to `query()` in the Node tutorial.

Required env vars: `INFLUXDB_URL`, `INFLUXDB_TOKEN`, `INFLUXDB_DATABASE`, `INFLUXDB_PRODUCT_TABLE` (measurement / table name, e.g. `product`).
