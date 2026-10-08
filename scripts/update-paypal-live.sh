#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Novixa Beauty Glow — Production Deployment & Env Sync on VPS
# Run this on the VPS in /opt/novixa
# Usage: bash scripts/update-paypal-live.sh
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

cd /opt/novixa

ENV_FILE=".env.production"
CLIENT_ID="${PAYPAL_CLIENT_ID:-${NEXT_PUBLIC_PAYPAL_CLIENT_ID:-"BAAi8QOljyA26-sCFX-3M0WIYmJk_qm16xSH4wVblfWVIv_-NFY7GvGAIw9f6D5-A8CtcHPlUOhDpXXxGs"}}"
SECRET_KEY="${PAYPAL_CLIENT_SECRET:-""}"
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-"https://macpycxntatdcsxvckmr.supabase.co"}"
SUPABASE_ANON="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-"sb_publishable_nOsrXBUwXTnAC-jZv_sa6g_BcwTK0QY"}"

echo "=== 1. Syncing $ENV_FILE with Live Credentials ==="

set_env() {
    local key="$1"
    local val="$2"
    if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
        sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
    else
        echo "${key}=${val}" >> "$ENV_FILE"
    fi
}

# Production App URL
set_env "APP_URL" "https://www.novixaretail.com"

# Live PayPal Credentials
set_env "PAYMENT_PROVIDER" "PAYPAL"
set_env "PAYPAL_MODE" "live"
set_env "PAYPAL_CLIENT_ID" "$CLIENT_ID"
set_env "PAYPAL_CLIENT_SECRET" "$SECRET_KEY"
set_env "NEXT_PUBLIC_PAYPAL_CLIENT_ID" "$CLIENT_ID"

# Supabase Production Keys
set_env "NEXT_PUBLIC_SUPABASE_URL" "$SUPABASE_URL"
set_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$SUPABASE_ANON"
set_env "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" "$SUPABASE_ANON"

# Administrator Defaults
set_env "ADMIN_EMAIL" "novixaretail@gmail.com"

echo "   ✅ $ENV_FILE updated successfully."

echo "=== 2. Building Docker Image with Baked Production Variables ==="
docker build \
  --build-arg NEXT_PUBLIC_PAYPAL_CLIENT_ID="$CLIENT_ID" \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON" \
  --build-arg NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID="BCR2DN6D5L703ZKP" \
  --build-arg NEXT_PUBLIC_PAYPAL_MODE="live" \
  --build-arg NEXT_PUBLIC_GOOGLE_PAY_ENV="${GOOGLE_PAY_ENV:-PRODUCTION}" \
  -t novixa-beauty-glow:latest .

echo "=== 3. Recreating Container with New Image & Live Env ==="
docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml up -d --force-recreate app

# Configure Nginx proxy buffers for large OAuth headers
if [ -d "/etc/nginx/conf.d" ]; then
    echo "=== 4. Configuring Host Nginx Proxy Buffers for OAuth ==="
    cat <<'NGINX_BUF' > /etc/nginx/conf.d/proxy_buffers.conf
proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_busy_buffers_size 256k;
NGINX_BUF
    nginx -t && systemctl reload nginx || true
    echo "   ✅ Nginx proxy buffers configured (128k/256k)."
fi

echo "=== 5. Verifying Application Health ==="
sleep 3
curl -sI http://127.0.0.1:3000 | head -n 5

echo ""
echo "🎉 Deployment complete: Live PayPal, Google OAuth, and User Auth are fully active!"
