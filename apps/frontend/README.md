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

## Developing

The frontend requires a PostgreSQL connection. Create a root `.env` file with
`DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, and `DB_PASSWORD` before
starting the app.

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```
npm run dev
pnpm dev
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

## Pages
`/search`
Goes to the search pages, much like what would you see with a search engine. The
possible query parameters are:
`name` which represents the string query for the name of the product
`id` which represents the string query for the retailer id of the product
`page` which represents the page number wanted for the search result page

More complex queries arise from the advanced search. Make the advanced search an
upcoming feature and deal with these queries later on
`store` is either "Woolworths" or "Coles"
`minPrice` and `maxPrice` defines the range for the price
`categories` represents the string query for the category name
