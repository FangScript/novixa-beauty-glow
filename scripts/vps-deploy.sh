#!/usr/bin/env bash
# ==============================================================================
# Novixa Beauty Glow - Automated AlmaLinux 9 VPS Deployment Script
# Target: 203.161.56.87 / novixaretail.com
# ==============================================================================

set -e

echo "=========================================================="
echo " Starting Novixa Beauty Glow Deployment on AlmaLinux 9"
echo "=========================================================="

APP_DIR="/var/www/novixa"
REPO_URL="https://github.com/FangScript/novixa-beauty-glow.git"
DB_NAME="novixa"
DB_USER="novixa_user"
DB_PASS="NovixaSecure2026!"
APP_PORT=8080
DOMAIN="novixaretail.com"

# 1. Update OS packages and install core build tools
echo "==> [1/8] Updating packages and installing build utilities..."
dnf update -y
dnf install -y git curl wget tar bzip2 make gcc gcc-c++ policycoreutils-python-utils epel-release

# 2. Install Node.js 20 LTS
echo "==> [2/8] Installing Node.js 20 LTS..."
if ! command -v node >/dev/null 2>&1 || [[ $(node -v | cut -d'.' -f1) != "v20" ]]; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    dnf install -y nodejs
fi
npm install -g pm2

echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# 3. Install and configure PostgreSQL
echo "==> [3/8] Setting up PostgreSQL..."
dnf install -y postgresql-server postgresql-contrib

if [ ! -f /var/lib/pgsql/data/PG_VERSION ]; then
    postgresql-setup --initdb
fi

systemctl enable postgresql --now

# Configure PostgreSQL md5 password authentication
PG_HBA="/var/lib/pgsql/data/pg_hba.conf"
if [ -f "$PG_HBA" ]; then
    sed -i 's/ident/md5/g' "$PG_HBA"
    sed -i 's/scram-sha-256/md5/g' "$PG_HBA"
    systemctl restart postgresql
fi

# Create Database and User if they don't exist
sudo -u postgres psql -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASS'; END IF; END \$\$;"
sudo -u postgres psql -c "SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# 4. Clone or update codebase
echo "==> [4/8] Fetching project codebase from GitHub..."
mkdir -p /var/www
if [ -d "$APP_DIR/.git" ]; then
    echo "Updating existing repository in $APP_DIR..."
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/main
else
    echo "Cloning repository into $APP_DIR..."
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# 5. Configure production .env
echo "==> [5/8] Configuring .env file..."
if [ ! -f "$APP_DIR/.env" ]; then
    cat <<EOF > "$APP_DIR/.env"
NODE_ENV=production
APP_URL=https://www.novixaretail.com
AUTH_URL=https://www.novixaretail.com
AUTH_SECRET=$(openssl rand -hex 32)

DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}?schema=public"
DIRECT_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}?schema=public"

ADMIN_EMAIL=${ADMIN_EMAIL:-"novixaretail@gmail.com"}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-$(openssl rand -base64 18)}

# PayPal Complete Payments (PPCP) - Live Credentials
PAYMENT_PROVIDER=PAYPAL
PAYPAL_MODE=live
PAYPAL_CLIENT_ID="BAAi8QOljyA26-sCFX-3M0WIYmJk_qm16xSH4wVblfWVIv_-NFY7GvGAIw9f6D5-A8CtcHPlUOhDpXXxGs"
PAYPAL_CLIENT_SECRET="EHGkhsGc-Xwzi7U6ZvGTxe2D90LFdvE6O7KXCIqeWIOZrxIZ3QCXxdT4ZVMl2crnLskJ5VxQkT7yre24"
NEXT_PUBLIC_PAYPAL_CLIENT_ID="BAAi8QOljyA26-sCFX-3M0WIYmJk_qm16xSH4wVblfWVIv_-NFY7GvGAIw9f6D5-A8CtcHPlUOhDpXXxGs"
NEXT_PUBLIC_PAYPAL_MODE=live

# Google Pay Live Merchant ID
NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID="BCR2DN6D5L703ZKP"
EOF
    echo ".env created with production secrets."
else
    echo "Existing .env file retained."
fi

# 6. Install dependencies, run Prisma migrations, seed, and build Next.js
echo "==> [6/8] Installing dependencies and building application..."
cd "$APP_DIR"
npm install --legacy-peer-deps

echo "Applying Prisma database migrations..."
npx prisma db push --accept-data-loss
npx prisma generate

echo "Seeding initial products, categories & shipping rates..."
npm run db:seed || true

echo "Building Next.js production bundle..."
npm run build

# 7. Start/Restart PM2 Process (Port 8080)
echo "==> [7/8] Managing PM2 processes..."
pm2 delete novixa-store 2>/dev/null || true
pm2 start npm --name "novixa-store" -- start
pm2 save
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root 2>/dev/null || true

# 8. Setup Nginx and Firewall
echo "==> [8/8] Configuring Nginx and Firewalld..."
dnf install -y nginx certbot python3-certbot-nginx

# SELinux: allow Nginx network proxy connection
setsebool -P httpd_can_network_connect 1

cat <<EOF > /etc/nginx/conf.d/novixa.conf
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN} 203.161.56.87;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

nginx -t
systemctl enable nginx --now
systemctl restart nginx

# Firewall configuration
if command -v firewall-cmd >/dev/null 2>&1; then
    firewall-cmd --permanent --add-service=http 2>/dev/null || true
    firewall-cmd --permanent --add-service=https 2>/dev/null || true
    firewall-cmd --reload 2>/dev/null || true
fi

# Obtain free Let's Encrypt SSL certificate for Apple Pay
if [ "$DOMAIN" != "localhost" ]; then
    echo "Obtaining SSL certificate for ${DOMAIN} and www.${DOMAIN}..."
    certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" --non-interactive --agree-tos --email novixaretail@gmail.com --redirect || echo "Note: Run certbot manually once DNS is pointed."
fi

echo "=========================================================="
echo " Deployment Successfully Completed!"
echo " Visit: https://www.novixaretail.com"
echo " PM2 status: pm2 status"
echo " Logs: pm2 logs novixa-store"
echo "=========================================================="
