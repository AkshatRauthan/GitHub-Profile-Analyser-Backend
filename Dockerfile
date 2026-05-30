# Hugging Face Docker Space — Node.js backend
# https://huggingface.co/docs/hub/spaces-sdks-docker

FROM node:22-alpine AS builder

WORKDIR /app

# Prisma config requires DATABASE_URL at generate time; HF secrets are not available during build
ENV DATABASE_URL="mysql://build:build@127.0.0.1:3306/build"

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src

RUN npm run db:generate && npm run build

FROM node:22-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=7860

# Official node image already includes user `node` (uid 1000) — required by HF
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/prisma ./prisma

USER node

EXPOSE 7860

CMD ["node", "dist/index.js"]
