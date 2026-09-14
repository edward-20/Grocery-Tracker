FROM node:22-bookworm AS build

WORKDIR /workspace
RUN corepack enable

# Install from the workspace root so pnpm can resolve workspace dependencies.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared/db/package.json packages/shared/db/package.json
COPY packages/shared/domain-model/package.json packages/shared/domain-model/package.json
RUN pnpm install --frozen-lockfile

COPY apps/frontend apps/frontend
COPY packages/shared/db packages/shared/db
COPY packages/shared/domain-model packages/shared/domain-model

# The ellipsis also builds the frontend's workspace dependencies.
RUN pnpm --filter @grocery-tracker/frontend... run build
RUN pnpm --filter @grocery-tracker/frontend deploy --legacy --prod /app

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app ./

EXPOSE 3000
CMD ["node", "build"]
