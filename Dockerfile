# ──────────────────────────────────────────────────────────────────────────────
# Novixa Beauty Glow — Production Dockerfile
# Multi-stage build for Next.js 15 standalone output
# Final image ~150MB (node:20-alpine base)
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install production + dev dependencies (dev needed for build step)
RUN npm ci --ignore-scripts
# Generate Prisma client
RUN npx prisma generate

# ── Stage 2: Build the application ────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for env vars needed at build time
# These are baked into the static pages / client bundle
ARG NEXT_PUBLIC_PAYPAL_CLIENT_ID="BAAi8QOljyA26-sCFX-3M0WIYmJk_qm16xSH4wVblfWVIv_-NFY7GvGAIw9f6D5-A8CtcHPlUOhDpXXxGs"
ARG NEXT_PUBLIC_SUPABASE_URL="https://macpycxntatdcsxvckmr.supabase.co"
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_nOsrXBUwXTnAC-jZv_sa6g_BcwTK0QY"
ARG NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID="BCR2DN6D5L703ZKP"
ARG NODE_ENV=production

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=${NODE_ENV}
ENV NEXT_PUBLIC_PAYPAL_CLIENT_ID=${NEXT_PUBLIC_PAYPAL_CLIENT_ID}
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID=${NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID}

RUN npm run build

# ── Stage 3: Production runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl curl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Security: run as non-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone output (includes server.js + node_modules subset)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema + migrations for runtime migration support
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=deps /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps /app/node_modules/.bin ./node_modules/.bin

USER nextjs
EXPOSE 8080

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

# Start the Next.js standalone server
CMD ["node", "server.js"]
