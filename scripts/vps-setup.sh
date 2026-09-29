#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Novixa Beauty Glow — VPS Initial Setup Script (AlmaLinux / RHEL)
# Run this ONCE on a fresh VPS to prepare it for deployments
#
# Usage: bash /tmp/vps-setup.sh novixaretail.com
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DEPLOY_USER="deploy"
DEPLOY_PATH="/opt/novixa"
DOMAIN="${1:-novixaretail.com}"

echo "╔══════════════════════════════════════════════╗"
echo "║  Novixa VPS Setup (AlmaLinux)                ║"
echo "╚══════════════════════════════════════════════╝"

# ── 1. System updates & EPEL ──────────────────────────────────────────────────
echo "📦 Updating system packages & enabling EPEL..."
dnf install -y epel-release
dnf update -y

# ── 2. Install Docker ────────────────────────────────────────────────────────
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    dnf install -y dnf-plugins-core
    dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    dnf install -y --allowerasing docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
fi

# Verify Docker is running
docker --version
docker compose version

# ── 3. Install useful tools ──────────────────────────────────────────────────
echo "🔧 Installing utilities..."
dnf install -y \
    curl \
    wget \
    git \
    htop \
    fail2ban \
    unzip \
    jq \
    openssl

# ── 4. Create deploy user ────────────────────────────────────────────────────
echo "👤 Setting up deploy user..."
if ! id "$DEPLOY_USER" &> /dev/null; then
    useradd -m -s /bin/bash "$DEPLOY_USER"
    usermod -aG docker "$DEPLOY_USER"

    # Copy SSH keys from root
    mkdir -p /home/$DEPLOY_USER/.ssh
    if [ -f /root/.ssh/authorized_keys ]; then
        cp /root/.ssh/authorized_keys /home/$DEPLOY_USER/.ssh/
    fi
    chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
    chmod 700 /home/$DEPLOY_USER/.ssh
    [ -f /home/$DEPLOY_USER/.ssh/authorized_keys ] && chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys
fi

# ── 5. Create deployment directory ───────────────────────────────────────────
echo "📁 Creating deployment directory..."
mkdir -p "$DEPLOY_PATH"/{nginx/conf.d,certbot/{conf,www},backups}
chown -R $DEPLOY_USER:$DEPLOY_USER "$DEPLOY_PATH"

# ── 6. Firewall setup (firewalld — AlmaLinux default) ────────────────────────
echo "🔥 Configuring firewall..."
if command -v firewall-cmd &> /dev/null; then
    systemctl enable firewalld
    systemctl start firewalld
    firewall-cmd --permanent --add-service=ssh
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
    echo "   Firewall: SSH, HTTP, HTTPS allowed"
fi

# ── 7. Fail2ban for SSH protection ───────────────────────────────────────────
echo "🛡️ Configuring fail2ban..."
cat > /etc/fail2ban/jail.local <<EOF
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/secure
maxretry = 5
bantime = 3600
findtime = 600
backend = systemd
EOF
systemctl enable fail2ban
systemctl restart fail2ban

# ── 8. Create .env.production template ────────────────────────────────────────
echo "📝 Creating environment template..."
GENERATED_DB_PASS=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-32)
GENERATED_AUTH_SECRET=$(openssl rand -base64 48 | tr -d '/+=' | cut -c1-48)

if [ ! -f "$DEPLOY_PATH/.env.production" ]; then
    cat > "$DEPLOY_PATH/.env.production" <<EOF
# ── Runtime ──
APP_URL=https://$DOMAIN
NODE_ENV=production

# ── PostgreSQL (Docker internal) ──
POSTGRES_DB=novixa
POSTGRES_USER=novixa_user
POSTGRES_PASSWORD=$GENERATED_DB_PASS
DATABASE_URL=postgresql://novixa_user:${GENERATED_DB_PASS}@db:5432/novixa?schema=public
DIRECT_URL=postgresql://novixa_user:${GENERATED_DB_PASS}@db:5432/novixa?schema=public

# ── Authentication ──
AUTH_SECRET=$GENERATED_AUTH_SECRET
AUTH_URL=https://$DOMAIN

# ── Email ──
EMAIL_PROVIDER=GMAIL
EMAIL_FROM="NOVIXA <novixaretail@gmail.com>"
SUPPORT_EMAIL=novixaretail@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=

# ── Payments ──
PAYMENT_PROVIDER=LOCAL_GATEWAY
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_MODE=sandbox
NEXT_PUBLIC_PAYPAL_CLIENT_ID=

# ── Google OAuth ──
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
EOF
    chown $DEPLOY_USER:$DEPLOY_USER "$DEPLOY_PATH/.env.production"
    chmod 600 "$DEPLOY_PATH/.env.production"
    echo "   ✅ Generated .env.production with auto-matched DB password"
    echo "   ⚠️  Edit $DEPLOY_PATH/.env.production to fill in SMTP, OAuth, etc."
fi

# ── 9. SSL certificate (initial) ─────────────────────────────────────────────
echo "🔐 Setting up SSL..."
if [ "$DOMAIN" != "YOUR_DOMAIN.com" ]; then
    # Start a temporary nginx for ACME challenge
    docker run -d --name temp-nginx \
        -p 80:80 \
        -v "$DEPLOY_PATH/certbot/www:/var/www/certbot" \
        nginx:alpine

    sleep 3

    # Request certificate
    docker run --rm \
        -v "$DEPLOY_PATH/certbot/conf:/etc/letsencrypt" \
        -v "$DEPLOY_PATH/certbot/www:/var/www/certbot" \
        certbot/certbot certonly \
            --webroot \
            --webroot-path=/var/www/certbot \
            --email "admin@$DOMAIN" \
            --agree-tos \
            --no-eff-email \
            -d "$DOMAIN" \
            -d "www.$DOMAIN"

    docker stop temp-nginx && docker rm temp-nginx
    echo "   ✅ SSL certificate obtained for $DOMAIN"
else
    echo "   ⏭️  Skipping SSL — pass your domain as argument"
fi

# ── 10. Cron for SSL renewal ─────────────────────────────────────────────────
echo "⏰ Setting up SSL renewal cron..."
(crontab -l 2>/dev/null; echo "0 3 * * 1 cd $DEPLOY_PATH && docker compose -f docker-compose.prod.yml run --rm certbot renew") | crontab -

# ── 11. Database backup cron ─────────────────────────────────────────────────
echo "💾 Setting up database backup cron..."
cat > "$DEPLOY_PATH/backup-db.sh" <<'BACKUP'
#!/usr/bin/env bash
set -euo pipefail
BACKUP_DIR="/opt/novixa/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker exec novixa-db pg_dumpall -U novixa_user > "$BACKUP_DIR/novixa_$TIMESTAMP.sql"
gzip "$BACKUP_DIR/novixa_$TIMESTAMP.sql"
# Keep only last 7 backups
ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm
echo "[$(date)] Backup completed: novixa_$TIMESTAMP.sql.gz"
BACKUP
chmod +x "$DEPLOY_PATH/backup-db.sh"
(crontab -l 2>/dev/null; echo "0 2 * * * $DEPLOY_PATH/backup-db.sh >> $DEPLOY_PATH/backups/backup.log 2>&1") | crontab -

# ── 12. SELinux — allow Docker networking ─────────────────────────────────────
echo "🔒 Configuring SELinux for Docker..."
if command -v getenforce &> /dev/null && [ "$(getenforce)" != "Disabled" ]; then
    setsebool -P container_manage_cgroup 1 2>/dev/null || true
    echo "   SELinux: container_manage_cgroup enabled"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  ✅  VPS setup complete!                                        ║"
echo "║                                                                  ║"
echo "║  Next steps:                                                     ║"
echo "║  1. nano $DEPLOY_PATH/.env.production (fill SMTP, OAuth)        ║"
echo "║  2. Configure Jenkins credentials                                ║"
echo "║  3. Push to 'main' branch to trigger deployment                  ║"
echo "║                                                                  ║"
echo "║  Or manual first deploy:                                         ║"
echo "║  cd /opt/novixa                                                  ║"
echo "║  git clone YOUR_REPO .                                           ║"
echo "║  docker build -t novixa-beauty-glow:latest .                     ║"
echo "║  docker compose -f docker-compose.prod.yml up -d                 ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
