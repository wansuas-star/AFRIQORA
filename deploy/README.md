# AFRIQORA Linux VPS Deployment Suite

This directory contains automated provisioning scripts, process manager configurations, reverse-proxy definitions, and environment templates to deploy AFRIQORA to a single Ubuntu 24.04/22.04 LTS Linux VPS.

---

## Files in this Directory

| File | Purpose |
| :--- | :--- |
| **`01-setup-server.sh`** | Provisions a clean Ubuntu VPS: installs Node 22, Git, Nginx, Certbot, PM2, and configures UFW firewall. |
| **`02-deploy-app.sh`** | Idempotent build script: triggers pre-deploy DB backup, compiles backend & frontend, enforces DB permissions, reloads PM2 and Nginx. |
| **`production.env.template`** | Secure production environment template with placeholders (AI disabled by default via `AI_EXPLANATION_ENABLED=false`, secrets masked). |
| **`ecosystem.config.js`** | Production PM2 process configuration with `instances: 1` to guarantee SQLite concurrency safety. |
| **`nginx.conf`** | Production-hardened Nginx reverse proxy definition with HTTPS redirection, security headers, and 60s timeouts. |
| **`backup-cron.sh`** | Daily automated snapshot and 30-day retention pruning script using SHA-256 verification and explicit PATH. |

---

## Execution Flow (When Approved)

### Step 1: Server Provisioning
Run on a fresh Ubuntu 24.04/22.04 LTS VPS instance as root:
```bash
sudo bash deploy/01-setup-server.sh
```

### Step 2: Environment Configuration
Copy the template and populate placeholders (keep `AI_EXPLANATION_ENABLED=false`):
```bash
cp deploy/production.env.template /var/www/afriqora/backend/.env
chmod 600 /var/www/afriqora/backend/.env
nano /var/www/afriqora/backend/.env
```

### Step 3: Database Setup & Transfer
Because `.gitignore` excludes `*.db`, `git clone` will not include the database. Transfer the genuine local database file (860 KB containing 127 users, 8 targets, 52 reports) to the VPS:
```bash
# Run from local machine:
scp C:/Users/hp/Documents/AFRQORA/backend/prisma/dev.db user@vps_ip:/var/www/afriqora/backend/prisma/dev.db
```
On the VPS, verify permissions:
```bash
chmod 755 /var/www/afriqora/backend/prisma
chmod 644 /var/www/afriqora/backend/prisma/dev.db
```

### Step 4: Deploy Application
Run the automated build and process launcher:
```bash
bash deploy/02-deploy-app.sh
```

### Step 5: SSL Certificate Activation
Issue and install automated Let's Encrypt certificates:
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Step 6: Automated Backups
Schedule daily backups with 30-day automated pruning (`crontab -e`):
```bash
0 2 * * * /bin/bash /var/www/afriqora/deploy/backup-cron.sh >> /var/www/afriqora/backend/logs/backup.log 2>&1
```

---

## Disaster Recovery & Database Restore Procedure

Backups are created automatically in `/var/www/afriqora/backend/backups/` with SHA-256 checksums recorded in companion `.meta.json` files.

To restore from a backup:
1. **Stop the backend process**:
   ```bash
   pm2 stop afriqora-production-api
   ```
2. **Verify backup integrity**:
   ```bash
   cd /var/www/afriqora/backend/backups
   sha256sum -c <(echo "$(jq -r .sha256Hash afriqora-db-backup-<timestamp>.sqlite.meta.json)  afriqora-db-backup-<timestamp>.sqlite")
   ```
3. **Restore the snapshot**:
   ```bash
   cp afriqora-db-backup-<timestamp>.sqlite /var/www/afriqora/backend/prisma/dev.db
   chmod 644 /var/www/afriqora/backend/prisma/dev.db
   ```
4. **Restart the process**:
   ```bash
   pm2 restart afriqora-production-api
   ```
