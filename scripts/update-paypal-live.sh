#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Novixa Beauty Glow — Switch PayPal to Live Credentials on VPS
# Run this on the VPS in /opt/novixa
# Usage: bash scripts/update-paypal-live.sh
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

cd /opt/novixa

ENV_FILE=".env.production"
CLIENT_ID="BAAi8QOljyA26-sCFX-3M0WIYmJk_qm16xSH4wVblfWVIv_-NFY7GvGAIw9f6D5-A8CtcHPlUOhDpXXxGs"
SECRET_KEY="EHGkhsGc-Xwzi7U6ZvGTxe2D90LFdvE6O7KXCIqeWIOZrxIZ3QCXxdT4ZVMl2crnLskJ5VxQkT7yre24"

echo "=== 1. Updating $ENV_FILE with Live PayPal Credentials ==="

# Helper function to set or append key=val
set_env() {
    local key="$1"
    local val="$2"
    if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
        sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
    else
        echo "${key}=${val}" >> "$ENV_FILE"
    fi
}

set_env "PAYMENT_PROVIDER" "PAYPAL"
set_env "PAYPAL_MODE" "live"
set_env "PAYPAL_CLIENT_ID" "$CLIENT_ID"
set_env "PAYPAL_CLIENT_SECRET" "$SECRET_KEY"
set_env "NEXT_PUBLIC_PAYPAL_CLIENT_ID" "$CLIENT_ID"

echo "   ✅ $ENV_FILE updated successfully."
grep -E "(PAYPAL|PAYMENT_PROVIDER)" "$ENV_FILE" | sed "s/$SECRET_KEY/[REDACTED-SECRET]/"

echo "=== 2. Building Docker Image with Live PayPal Client ID ==="
docker build \
  --build-arg NEXT_PUBLIC_PAYPAL_CLIENT_ID="$CLIENT_ID" \
  -t novixa-beauty-glow:latest .

echo "=== 3. Recreating Container with New Image & Live Env ==="
docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml up -d --force-recreate app

echo "=== 4. Verifying Application Health ==="
sleep 3
curl -sI http://127.0.0.1:3000 | head -n 5

echo ""
echo "🎉 Live PayPal credentials successfully configured and active!"
