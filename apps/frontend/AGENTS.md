# Agents

## Commands

```sh
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm preview      # Preview production build
pnpm check        # TypeScript + Svelte type checking
pnpm check:watch  # Watch mode for type checking
pnpm lint         # Prettier + ESLint
pnpm format       # Auto-fix formatting
```

## Setup

- **Use pnpm** (not npm). Project has `pnpm-lock.yaml` and `.npmrc` with `engine-strict=true`.
- **Required env vars** (create `.env` from `.env.example`):
  - `INFLUXDB_URL` - InfluxDB Cloud Serverless host
  - `INFLUXDB_TOKEN` - Auth token
  - `INFLUXDB_DATABASE` - Database name (e.g., `Groc`)
  - `INFLUXDB_PRODUCT_TABLE` - Measurement/table name (e.g., `product`)
  - `USE_MOCK_DATA` - Set to `"true"` to use mock data instead of querying InfluxDB (useful for offline dev)

## Tech Stack

- **SvelteKit** with Svelte 5 (uses `$state` runes)
- **TypeScript** (strict mode)
- **Tailwind CSS v4** + daisyUI + `@tailwindcss/typography` + `@tailwindcss/forms`
- **InfluxDB 3 Cloud Serverless** - queries via SQL via `@influxdata/influxdb3-client`
- **Vite** with `@sveltejs/kit`

## Code Organization

| Path                  | Purpose                                              |
| --------------------- | ---------------------------------------------------- |
| `src/routes/`         | SvelteKit pages and API endpoints                    |
| `src/lib/server/`     | Server-only code (InfluxDB queries, mock data)       |
| `src/lib/components/` | Shared Svelte components                             |
| `static/`             | Static assets                                        |

## Architecture Notes

- SvelteKit `+server.ts` files in `src/routes/` are API endpoints
- Server-only utilities go in `src/lib/server/`
- Client-accessible code goes in `src/lib/` (auto-aliased as `$lib`)
- `$env/dynamic/private` for server-side env vars

## Lint/Format Order

`pnpm format` before `pnpm lint` if making style fixes. Prettier handles formatting, ESLint handles code quality.

## Component Creation

What are we testing for? Component testing: rendering, user interaction,
conditional UI.

Before a component is made, a test for that component must be written to the
`src/lib/components/__tests__` directory. Either create a file named after the
component in kebab case with the extension `.test.ts` e.g. for a Search Bar
component write the file: `search-bar.test.ts` that contains all the code
relevant to testing. If containing the test to a single file makes the code
unreadable create a directory named after the component in kebab case, for e.g.
for a Dropdown Menu component create the directory `dropdown-menu` and colocate
all relevant files to the test inside that directory. For e.g. wrapper
components, helper functions, mocks.

Test that the component renders correctly, user interactions will have the
component behave in the correct way, for e.g. clicking on a text input will have
the input in focus and that the correct UI is shown given certain conditions,
for e.g. an editable combobox will present the popup when input is given to the
combobox. The component must be tested in isolation, that is if the component
has any dependencies on external systems, other utilities in codebase or other
things, these must be mocked.

Vitest is the test framework, use its API to create behaviour driven tests.
Use a wrapper component if the component being tested has props that cannot be
mocked simply for e.g. if the component has the following props:

```
	let { query = $bindable(), url, name, label, placeholder } = $props();
```

then `query` cannot be mocked by a simple variable as this will cause compile
issues. Therefore create a wrapper svelte component if necessary that provides a
state variable to the wrapped component.
Use `@testing-library/svelte` to render the svelte component. Try to minimise
the use of the `act`, `cleanup` and `fireEvent`.
Use `msw` for mocking network responses if the component makes requests.
Use '@testing-library/user-event' to initiate user interactions.
Use `@testing-library/jest-dom/vitest` for matchers (imported already in `vitest.setup.ts`).

Every component is added to the `src/lib/components` directory as its own
directory with the name in kebab case. The contents of the directory are.

- `context.ts` for shared state or logic between components
- `index.ts` for public export entry point
- `component.svelte` for the component itself
- `types.ts` for typescript definitions

## Agent workflow

Make a commit for every non-trivial change. For every point of every plan make a commit.
For policy refer commmit message to Commit Messages for more
information.

### Commit Messages

Follow conventional commit standards, that is have commit messages of the
following form:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Available types are:

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

Mention important files that are changed, that is files that influence many
aspects of the codebase, e.g. `vitest.config.ts`.
