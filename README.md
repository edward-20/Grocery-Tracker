# .env
In order to provide a local dev instance of postgres for frontend, have `.env`
file with:

`DB_HOST`
`DB_PORT`
`DB_DATABASE`
`DB_USER`
`DB_PASSWORD`

Keep in mind if you have a local running postgres, then you should ensure that
`DB_HOST` is not 5432.
