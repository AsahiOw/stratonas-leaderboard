# syntax=docker/dockerfile:1

FROM node:22.23.4-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
RUN --mount=type=cache,id=stratonas-npm,target=/root/.npm \
    npm ci --ignore-scripts --prefer-offline --no-audit --no-fund

FROM deps AS builder
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
# Only compilation inputs invalidate the Next.js build. Public assets are
# copied into the runner separately; this font is imported by next/font/local.
COPY next.config.mjs postcss.config.mjs tailwind.config.ts tsconfig.json tsconfig.seed.json prisma.config.ts ./
COPY prisma ./prisma
COPY scripts ./scripts
COPY src ./src
COPY public/font ./public/font
# Next treats Docker as ephemeral and otherwise generates a new Server Actions
# key each build, invalidating Webpack's cache. Match its normal 14-day reuse.
RUN --mount=type=cache,id=stratonas-next-webpack,target=/app/.next/cache,sharing=locked \
    if [ ! -f .next/cache/server-actions.key ] || \
       [ -n "$(find .next/cache/server-actions.key -mtime +13 -print)" ]; then \
      node -e "require('node:fs').writeFileSync('.next/cache/server-actions.key', require('node:crypto').randomBytes(32).toString('base64'), { mode: 0o600 })"; \
    fi && \
    NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$(cat .next/cache/server-actions.key)" npm run build
# The runner copies the full dependency tree for Prisma's migration CLI below.
# Do not also ship a second copy of those packages in the standalone layer.
RUN rm -rf .next/standalone/node_modules

FROM node:22.23.4-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl ffmpeg yt-dlp
ARG BGUTIL_POT_PROVIDER_VERSION=1.3.1
RUN mkdir -p /usr/local/share/yt-dlp-plugins && \
    wget -q "https://github.com/Brainicism/bgutil-ytdlp-pot-provider/releases/download/${BGUTIL_POT_PROVIDER_VERSION}/bgutil-ytdlp-pot-provider.zip" \
      -O /usr/local/share/yt-dlp-plugins/bgutil-ytdlp-pot-provider.zip
ENV MEDIA_YTDLP_PLUGIN_DIR=/usr/local/share/yt-dlp-plugins
ENV MEDIA_YTDLP_PO_TOKEN_PROVIDER_URL=http://bgutil-provider:4416

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

RUN mkdir -p /app/Development_data/lobbies /app/Development_data/lobbies-optimized /app/Development_data/lobby-posters /app/Development_data/radio/audio /app/Development_data/radio/thumbnails && chown -R nextjs:nodejs /app/Development_data
RUN mkdir -p /app/public/assets/club && chown -R nextjs:nodejs /app/public/assets/club
RUN mkdir -p /app/public/assets/custom-student && chown -R nextjs:nodejs /app/public/assets/custom-student
RUN mkdir -p /app/public/assets/gacha/banner /app/public/assets/gacha/animation && chown -R nextjs:nodejs /app/public/assets/gacha
# Independent copy layers keep unchanged assets and dependencies reusable
# when only the compiled application changes.
COPY --link --chown=1001:1001 public ./public
COPY --link --from=builder --chown=1001:1001 /app/.next/standalone ./
COPY --link --from=builder --chown=1001:1001 /app/.next/static ./.next/static
COPY --link --from=builder /app/prisma ./prisma
COPY --link --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --link --from=builder /app/src/generated/prisma ./src/generated/prisma
COPY --link --from=builder /app/node_modules ./node_modules

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "node ./node_modules/prisma/build/index.js migrate deploy && node server.js"]
