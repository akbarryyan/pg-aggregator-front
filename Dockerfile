# syntax=docker/dockerfile:1

# Production image for the WhuzPay web app (served behind Caddy on the VPS, see
# back/DEPLOY.md). NEXT_PUBLIC_API_URL is inlined into the browser bundle at
# build time, so it is a build argument: one image per API URL. Never build
# with a .env.local present in the context (.dockerignore excludes it).
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:${NODE_VERSION}-alpine AS build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Fail the build instead of shipping a bundle that talks to the localhost fallback.
RUN test -n "$NEXT_PUBLIC_API_URL" || (echo "NEXT_PUBLIC_API_URL build arg is required" >&2; exit 1)
RUN npm run build

# runtime: must stay the LAST stage so a build without --target produces it.
FROM node:${NODE_VERSION}-alpine AS runtime
ARG VERSION=dev
LABEL org.opencontainers.image.source="https://github.com/akbarryyan/pg-aggregator-front" \
      org.opencontainers.image.title="whuzpay-frontend" \
      org.opencontainers.image.version="${VERSION}"
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S -g 10001 app \
 && adduser -S -D -H -u 10001 -G app -h /app app
WORKDIR /app
# standalone output ships only the traced node_modules plus server.js; static
# assets and public/ are copied next to it (the server serves them itself).
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
CMD ["node", "server.js"]
