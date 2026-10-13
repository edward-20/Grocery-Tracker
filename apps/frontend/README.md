# About
Sveltekit frontend (server side rendered) interfacing with a postgres backend to
provide prices of Australian groceries from Coles and Woolworths.

* search feature (ARIA combobox) based on product names or ids using suggestions
* advanced search feature based on price range, time range, store filter,
category filter
* search results page
* individual product page showing time vs price graph
* AAA colour contrast

Currently very crude, but functional. Hoping to improve.

## Developing
The frontend requires a PostgreSQL connection. Create a `.env` file in this
package with `CONFIG_PATH` which is a path to a yml file containing configs for
the database amongst other things. Refer to the monorepo's root `README.md`.

## Pages
`/search`
Goes to the search pages, much like what would you see with a search engine. The
possible query parameters are:
`name` which represents the string query for the name of the product
`id` which represents the string query for the retailer id of the product
`page` which represents the page number wanted for the search result page

# Future Plans
* advanced search handling query parameters `store`, `minPrice`, `maxPrice`,
`categories`. This requires development from `@grocery-scraper/frontend` and
`@grocery-scraper/db`
* search page results list display with stylised cards with grocery item's image
* being able to order results of the pages based on popularity or other
