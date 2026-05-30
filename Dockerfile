# Hugging Face Docker Space — Node.js backend
# https://huggingface.co/docs/hub/spaces-sdks-docker

FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src

RUN npm run db:generate && npm run build

FROM node:22-alpine AS runner

RUN apk add --no-cache openssl \
    && addgroup -g 1000 user \
    && adduser -u 1000 -G user -s /bin/sh -D user

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=7860

COPY --from=builder --chown=user:user /app/package.json ./package.json
COPY --from=builder --chown=user:user /app/node_modules ./node_modules
COPY --from=builder --chown=user:user /app/dist ./dist
COPY --from=builder --chown=user:user /app/prisma ./prisma

USER user

EXPOSE 7860

CMD ["node", "dist/index.js"]
