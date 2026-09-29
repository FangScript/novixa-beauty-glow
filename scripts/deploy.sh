#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Novixa Beauty Glow — Manual Deploy Script
# Use when you need to deploy without Jenkins (e.g., hotfix, first deploy)
#
# Usage: ./scripts/deploy.sh [image-tag]
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DEPLOY_PATH="/opt/novixa"
DOCKER_IMAGE="novixa-beauty-glow"
IMAGE_TAG="${1:-latest}"

echo "╔══════════════════════════════════════════════╗"
echo "║  Novixa Manual Deploy — tag: $IMAGE_TAG      ║"
echo "╚══════════════════════════════════════════════╝"

cd "$DEPLOY_PATH"

# ── Build (if deploying locally on VPS) ───────────────────────────────────────
if [ ! "$(docker images -q ${DOCKER_IMAGE}:${IMAGE_TAG} 2>/dev/null)" ]; then
    echo "🐳 Image not found, building from source..."
    if [ -f "Dockerfile" ]; then
        docker build -t ${DOCKER_IMAGE}:${IMAGE_TAG} -t ${DOCKER_IMAGE}:latest .
    else
        echo "❌ No Dockerfile found and image not available. Aborting."
        exit 1
    fi
fi

# ── Run migrations ────────────────────────────────────────────────────────────
echo "🗄️ Running database migrations..."
export IMAGE_TAG
docker compose -f docker-compose.prod.yml --profile migration run --rm migrate

# ── Deploy app ────────────────────────────────────────────────────────────────
echo "🚀 Deploying application..."
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate app

# ── Health check ──────────────────────────────────────────────────────────────
echo "🏥 Checking health..."
for i in 1 2 3 4 5 6; do
    STATUS=$(docker inspect --format="{{.State.Health.Status}}" novixa-app 2>/dev/null || echo "not_found")
    if [ "$STATUS" = "healthy" ]; then
        echo "✅ App is healthy!"
        break
    fi
    echo "⏳ Waiting... ($STATUS) — attempt $i/6"
    sleep 10
done

echo ""
echo "📊 Container status:"
docker compose -f docker-compose.prod.yml ps
