FROM node:22-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS build
COPY package*.json ./
RUN npm ci
COPY tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app /app
COPY scripts/start.sh ./scripts/start.sh
COPY scripts/profile.graphql ./scripts/profile.graphql
USER node
EXPOSE 3000
CMD ["/bin/sh", "./scripts/start.sh"]
