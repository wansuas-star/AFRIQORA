# AFRIQORA — Production Hosting & Deployment Runbook

## Platform Overview
- **Platform Identity:** African Satellite Technology, Satellite Communications, Earth Observation (ML-01), Sentinel-1 SAR, Sentinel-2 Optical, Maritime, DRC Conflict & Government Investigative Intelligence Platform
- **Repository Branch:** `preview/satellite-platform`
- **Backend Architecture:** Node.js v22/24 LTS, Express, TypeScript, Prisma ORM (SQLite single-writer `fork` mode)
- **Frontend Architecture:** React, Vite SPA bundle (`frontend/dist`)
- **Security Policy:** Verified Platform Owner-Only Authorization Gate (`isPlatformOwner === true` AND `email === PLATFORM_OWNER_EMAIL`), Server-Side Default Deny, Zero Covert Surveillance

---

## Step 1: Server Provisioning
1. Provision a Linux VPS (Ubuntu 24.04 LTS or 22.04 LTS recommended):
   - Compute: 2+ vCPU, 4GB+ RAM, 50GB NVMe SSD.
2. Update system packages:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y curl git build-essential nginx certbot python3-certbot-nginx
   ```
3. Install Node.js 22 LTS:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt install -y nodejs
   sudo npm install -g pm2
   ```

---

## Step 2: Clone & Environment Setup
1. Clone the repository to `/var/www/afriqora`:
   ```bash
   sudo mkdir -p /var/www/afriqora
   sudo chown -R $USER:$USER /var/www/afriqora
   git clone -b preview/satellite-platform <REPO_URL> /var/www/afriqora
   cd /var/www/afriqora
   ```
2. Configure production backend environment:
   ```bash
   cp deploy/production.env.template backend/.env
   chmod 600 backend/.env
   nano backend/.env
   ```
   - Set `PLATFORM_OWNER_EMAIL` to your verified Platform Owner email.
   - Set `ALLOWED_ORIGINS` and `CORS_ORIGIN` to your public HTTPS domain.
   - Generate and set high-entropy 64-byte hex secrets for both `JWT_SECRET` and `INTEGRATION_MASTER_KEY`:
     ```bash
     openssl rand -hex 64
     ```
   - **Database Preservation Rule:** Keep `DATABASE_URL="file:./prisma/dev.db?connection_limit=1&socket_timeout=10"` and **never** run `prisma migrate reset` or `prisma migrate deploy` against the populated 33-table SQLite database; always create a verified backup snapshot via `node backend/scripts/backup-db.js` prior to any maintenance.

---

## Step 3: Production Build
1. Install dependencies & build backend:
   ```bash
   cd /var/www/afriqora/backend
   npm ci
   npx prisma generate
   npm run build
   ```
2. Install dependencies & build frontend:
   ```bash
   cd /var/www/afriqora/frontend
   npm ci
   npm run build
   ```

---

## Step 4: PM2 Process Management
Launch the backend service in single-instance `fork` mode (preventing SQLite concurrent write locks):
```bash
cd /var/www/afriqora
pm2 start deploy/ecosystem.config.js --env production
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
```

---

## Step 5: Nginx Reverse Proxy & SSL Configuration
1. Install Nginx configuration:
   ```bash
   sudo cp /var/www/afriqora/deploy/nginx.conf /etc/nginx/sites-available/afriqora
   sudo ln -s /etc/nginx/sites-available/afriqora /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```
2. Issue Free Let's Encrypt SSL Certificates:
   ```bash
   sudo certbot --nginx -d afriqora.com -d www.afriqora.com
   ```

---

## Step 6: Post-Deployment Smoke Verification
1. Verify API Health:
   ```bash
   curl -i https://afriqora.com/api/health
   ```
2. Verify Satellite Intelligence Status:
   ```bash
   curl -i https://afriqora.com/api/satellite/status
   ```
3. Verify Platform Owner Security Controls:
   ```bash
   curl -i -X POST https://afriqora.com/api/gov/access-requests/req-001/approve
   # Expected output: HTTP 401 Unauthorized (Blocked by server-side guard)
   ```
4. Confirm Decommissioned Commercial & Marketplace Endpoints:
   ```bash
   curl -i https://afriqora.com/api/commercial/business
   curl -i https://afriqora.com/api/marketplace
   # Expected output: HTTP 410 Gone
   ```
5. Confirm Live Connectors:
   - All live CCTV feeds and external forensics connectors remain **DISABLED** (`status != 'ACTIVE'`).
