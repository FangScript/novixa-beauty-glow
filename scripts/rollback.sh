#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Novixa Beauty Glow — Rollback Script
# Rolls back to a previous Docker image tag
#
# Usage: ./scripts/rollback.sh <image-tag>
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DEPLOY_PATH="/opt/novixa"
DOCKER_IMAGE="novixa-beauty-glow"
IMAGE_TAG="${1:?Usage: $0 <image-tag>}"

echo "╔══════════════════════════════════════════════╗"
echo "║  Novixa Rollback → tag: $IMAGE_TAG           ║"
echo "╚══════════════════════════════════════════════╝"

cd "$DEPLOY_PATH"

# Verify the image exists
if [ ! "$(docker images -q ${DOCKER_IMAGE}:${IMAGE_TAG} 2>/dev/null)" ]; then
    echo "❌ Image ${DOCKER_IMAGE}:${IMAGE_TAG} not found locally."
    echo ""
    echo "Available tags:"
    docker images ${DOCKER_IMAGE} --format "  • {{.Tag}}  ({{.CreatedSince}})"
    exit 1
fi

# Rollback
echo "🔄 Rolling back to ${DOCKER_IMAGE}:${IMAGE_TAG}..."
export IMAGE_TAG
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate app

# Health check
echo "🏥 Checking health..."
for i in 1 2 3 4 5 6; do
    STATUS=$(docker inspect --format="{{.State.Health.Status}}" novixa-app 2>/dev/null || echo "not_found")
    if [ "$STATUS" = "healthy" ]; then
        echo "✅ Rollback successful — app is healthy on tag: ${IMAGE_TAG}"
        exit 0
    fi
    echo "⏳ Waiting... ($STATUS) — attempt $i/6"
    sleep 10
done

echo "❌ Rollback health check failed!"
docker logs novixa-app --tail 30
exit 1
