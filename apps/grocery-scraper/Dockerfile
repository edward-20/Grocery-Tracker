# Keep this tag aligned with the resolved Playwright version in pnpm-lock.yaml.
# The Playwright image supplies Chromium and all of its required system libraries.
FROM mcr.microsoft.com/playwright:v1.62.1-noble AS build

WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/grocery-scraper/package.json apps/grocery-scraper/package.json
COPY packages/shared/db/package.json packages/shared/db/package.json
COPY packages/shared/domain-model/package.json packages/shared/domain-model/package.json
COPY packages/shared/utils/package.json packages/shared/utils/package.json
RUN pnpm install --frozen-lockfile

COPY apps/grocery-scraper apps/grocery-scraper
COPY packages/shared/db packages/shared/db
COPY packages/shared/domain-model packages/shared/domain-model
COPY packages/shared/utils packages/shared/utils

RUN pnpm --filter @grocery-tracker/scraper... run build
RUN pnpm --filter @grocery-tracker/scraper deploy --legacy --prod /app

FROM mcr.microsoft.com/playwright:v1.62.1-noble AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app ./

CMD ["node", "dist/worker.js"]
