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
