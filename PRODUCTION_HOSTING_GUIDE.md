# AFRIQORA — Production Hosting & Deployment Runbook

## Platform Overview
- **Repository Branch:** `prisma-migration-restart`
- **Backend Architecture:** Node.js v22/24 LTS, Express, TypeScript, Prisma ORM
- **Frontend Architecture:** React, Vite SPA bundle (`frontend/dist`)
- **Security Policy:** Platform Owner-Only Authorization Gate, Server-Side Default Deny, Zero Covert Surveillance

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
   git clone -b prisma-migration-restart <REPO_URL> /var/www/afriqora
   cd /var/www/afriqora
   ```
2. Configure production backend environment:
   ```bash
   cp backend/.env.production.example backend/.env
   nano backend/.env
   ```
   - Set `PLATFORM_OWNER_EMAIL` to your actual Platform Owner email.
   - Generate and set a high-entropy `JWT_SECRET`:
     ```bash
     openssl rand -hex 64
     ```

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
Launch the backend service in cluster mode:
```bash
cd /var/www/afriqora/backend
pm2 start ecosystem.config.js --env production
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
```

---

## Step 5: Nginx Reverse Proxy & SSL Configuration
1. Install Nginx configuration:
   ```bash
   sudo cp /var/www/afriqora/nginx.conf.example /etc/nginx/sites-available/afriqora
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
4. Confirm Live Connectors:
   - All live CCTV feeds and external forensics connectors remain **DISABLED** (`status != 'ACTIVE'`).
