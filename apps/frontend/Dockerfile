FROM node:22 AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml .
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm exec svelte-kit sync
RUN pnpm build
RUN pnpm prune --prod

FROM node:22
WORKDIR /app
COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY package.json .
EXPOSE 3000
ENV NODE_ENV=production
CMD [ "node", "build" ]
