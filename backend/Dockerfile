# Medusa backend: build admin + server in one image so `.medusa` is present at runtime.
# Railway Railpack often drops build outputs between phases; Docker fixes missing admin index.html.
#
# Railway: set service Root Directory to `backend`, Builder to Dockerfile, Start: `node ./scripts/railway-start.cjs`

FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build

RUN npm prune --omit=dev

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app /app

EXPOSE 9000

CMD ["node", "./scripts/railway-start.cjs"]
