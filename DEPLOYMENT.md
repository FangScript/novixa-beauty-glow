# Novixa Beauty Glow — CI/CD Deployment Guide

> **Stack**: Next.js 15 (standalone) · Docker · Jenkins · Nginx · PostgreSQL · Let's Encrypt  
> **Target**: VPS (Ubuntu 22.04+ / Debian 12+)

---

## Architecture Overview

```
┌─────────────┐     push      ┌──────────────┐     SSH/SCP     ┌──────────────────────────┐
│  Developer   │ ──────────▶  │   Jenkins     │ ─────────────▶  │        VPS               │
│  (Git Push)  │              │   Pipeline    │                 │                          │
└─────────────┘              └──────────────┘                 │  ┌──────────────────────┐ │
                                                               │  │  Nginx (port 80/443) │ │
                                                               │  │  ┌────────────────┐  │ │
                                                               │  │  │  Next.js App    │  │ │
                                                               │  │  │  (port 8080)    │  │ │
                                                               │  │  └────────────────┘  │ │
                                                               │  └──────────────────────┘ │
                                                               │  ┌──────────────────────┐ │
                                                               │  │  PostgreSQL 16       │ │
                                                               │  │  (port 5432)         │ │
                                                               │  └──────────────────────┘ │
                                                               └──────────────────────────┘
```

---

## Files Created

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build for Next.js standalone |
| `.dockerignore` | Excludes unnecessary files from build context |
| `docker-compose.prod.yml` | Production stack (app + DB + nginx + certbot) |
| `Jenkinsfile` | CI/CD pipeline definition |
| `nginx/nginx.conf` | Nginx main configuration |
| `nginx/conf.d/default.conf` | Site-specific config (SSL, proxy, rate limiting) |
| `scripts/vps-setup.sh` | One-time VPS bootstrap script |
| `scripts/deploy.sh` | Manual deployment script |
| `scripts/rollback.sh` | Rollback to a previous version |

---

## Step-by-Step Setup

### 1. Prepare the VPS

SSH into your VPS as root and run:

```bash
# Download and run the setup script
curl -fsSL https://raw.githubusercontent.com/YOUR_REPO/main/scripts/vps-setup.sh | bash -s -- yourdomain.com

# Or copy it manually:
scp scripts/vps-setup.sh root@YOUR_VPS_IP:/tmp/
ssh root@YOUR_VPS_IP 'bash /tmp/vps-setup.sh yourdomain.com'
```

This will:
- Install Docker & Docker Compose
- Create a `deploy` user with Docker access
- Configure firewall (UFW) — only SSH, HTTP, HTTPS
- Set up fail2ban for SSH protection
- Generate `.env.production` template with random secrets
- Obtain SSL certificate via Let's Encrypt
- Schedule daily DB backups & weekly SSL renewal

### 2. Configure Environment Variables

On the VPS, edit the production environment:

```bash
ssh deploy@YOUR_VPS_IP
nano /opt/novixa/.env.production
```

**Critical values to set:**
- `DATABASE_URL` — update the password to match `POSTGRES_PASSWORD`
- `SMTP_USER` / `SMTP_PASS` — for transactional email
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — for OAuth
- `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` — if using PayPal

### 3. Update Nginx Domain

Replace `YOUR_DOMAIN.com` in `nginx/conf.d/default.conf` with your actual domain.

### 4. Set Up Jenkins

#### Install Jenkins (on VPS or separate CI server):

```bash
# If running Jenkins on the same VPS:
docker run -d \
  --name jenkins \
  --restart unless-stopped \
  -p 8081:8080 \
  -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins/jenkins:lts
```

#### Required Jenkins Plugins:
- **Pipeline** (usually pre-installed)
- **Git** (usually pre-installed)
- **SSH Agent**
- **Docker Pipeline**
- **Credentials Binding**

#### Configure Jenkins Credentials:

Go to **Jenkins → Manage → Credentials → Global** and add:

| Credential ID | Type | Value |
|---------------|------|-------|
| `novixa-vps-host` | Secret text | Your VPS IP (e.g., `192.168.1.100`) |
| `novixa-vps-user` | Secret text | `deploy` |
| `novixa-vps-ssh-key` | SSH Username with private key | The deploy user's SSH private key |

#### Create the Pipeline Job:

1. **New Item** → **Pipeline**
2. Name: `novixa-beauty-glow`
3. Under **Pipeline**:
   - Definition: **Pipeline script from SCM**
   - SCM: **Git**
   - Repository URL: your repo URL
   - Branch: `*/main`
   - Script Path: `Jenkinsfile`
4. Save

### 5. First Deployment

**Option A — Via Jenkins:** Push to `main` → Jenkins auto-deploys.

**Option B — Manual first deploy:**

```bash
ssh deploy@YOUR_VPS_IP
cd /opt/novixa

# Clone repo (first time only)
git clone https://github.com/YOUR_REPO.git .

# Build and deploy
docker build -t novixa-beauty-glow:latest .

# Start all services (DB + app + nginx)
docker compose -f docker-compose.prod.yml up -d

# Run initial migrations
docker compose -f docker-compose.prod.yml --profile migration run --rm migrate

# Optional: seed initial data
docker compose -f docker-compose.prod.yml exec app npx prisma db seed
```

---

## Pipeline Flow

```
Push to main
     │
     ▼
┌─────────────────┐
│  1. Checkout     │ → Clone repo, extract commit info
└────────┬────────┘
         ▼
┌─────────────────┐
│  2. Lint & Type  │ → npm ci + tsc --noEmit + eslint
│     Check        │
└────────┬────────┘
         ▼
┌─────────────────┐
│  3. Docker Build │ → Multi-stage build, tagged with build #
└────────┬────────┘
         ▼
┌─────────────────┐
│  4. Transfer     │ → docker save → SCP → docker load on VPS
└────────┬────────┘
         ▼
┌─────────────────┐
│  5. Deploy       │ → Migrations + rolling update
└────────┬────────┘
         ▼
┌─────────────────┐
│  6. Health Check │ → Verify container is healthy
└─────────────────┘
```

---

## Common Operations

### View logs
```bash
# App logs
docker logs novixa-app -f --tail 100

# Nginx logs
docker logs novixa-nginx -f --tail 100

# Database logs
docker logs novixa-db -f --tail 50
```

### Rollback to a previous version
```bash
# List available image tags
docker images novixa-beauty-glow --format "{{.Tag}}  {{.CreatedSince}}"

# Rollback
./scripts/rollback.sh 42    # where 42 is the Jenkins build number
```

### Manual database backup
```bash
/opt/novixa/backup-db.sh
```

### Restore from backup
```bash
gunzip -c /opt/novixa/backups/novixa_20260929_020000.sql.gz | \
  docker exec -i novixa-db psql -U novixa_user -d novixa
```

### Scale (if needed in future)
```bash
docker compose -f docker-compose.prod.yml up -d --scale app=3
```

### Update SSL certificate manually
```bash
docker compose -f docker-compose.prod.yml run --rm certbot renew
docker compose -f docker-compose.prod.yml restart nginx
```

---

## Security Checklist

- [x] Non-root Docker user (`nextjs:1001`)
- [x] UFW firewall — only ports 22, 80, 443
- [x] Fail2ban on SSH
- [x] SSL/TLS with auto-renewal
- [x] HSTS headers
- [x] Rate limiting on API/auth routes
- [x] Secrets in `.env.production` (not in Docker image)
- [x] `X-Frame-Options`, `X-Content-Type-Options` headers
- [x] Daily database backups with 7-day retention
- [ ] Set up monitoring (Uptime Kuma / Grafana)
- [ ] Enable Docker log rotation
