#!/usr/bin/env bash
# ==============================================================================
# AFRIQORA Application Deployment & Build Script
# Usage: bash 02-deploy-app.sh
# ==============================================================================

set -euo pipefail

APP_ROOT="/var/www/afriqora"
BACKEND_DIR="$APP_ROOT/backend"
FRONTEND_DIR="$APP_ROOT/frontend"

echo "======================================================================"
echo " Deploying AFRIQORA Application"
echo "======================================================================"

cd "$APP_ROOT"

# 1. Verify environment configuration
if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "Error: Production configuration not found at $BACKEND_DIR/.env"
  echo "Please copy deploy/production.env.template to $BACKEND_DIR/.env and set your secrets."
  exit 1
fi

# 2. Verify database presence & enforce safe permissions
if [ ! -f "$BACKEND_DIR/prisma/dev.db" ]; then
  echo "Warning: Database not found at $BACKEND_DIR/prisma/dev.db"
  echo "Please ensure the existing dev.db is copied to $BACKEND_DIR/prisma/dev.db"
  exit 1
fi
chmod 755 "$BACKEND_DIR/prisma"
chmod 644 "$BACKEND_DIR/prisma/dev.db"

# 3. Create pre-deployment database backup
echo "[1/5] Creating pre-deployment database backup..."
if [ -f "$BACKEND_DIR/scripts/backup-db.js" ]; then
  cd "$BACKEND_DIR"
  node scripts/backup-db.js
  cd "$APP_ROOT"
fi

# 4. Install backend dependencies and build
echo "[2/5] Building backend..."
cd "$BACKEND_DIR"
npm ci
npx prisma generate
npm run build

# 5. Install frontend dependencies and build
echo "[3/5] Building frontend..."
cd "$FRONTEND_DIR"
npm ci
npm run build

# 6. Start or restart PM2 service
echo "[4/5] Updating PM2 process..."
cd "$BACKEND_DIR"
CONFIG_FILE="$APP_ROOT/deploy/ecosystem.config.js"
if [ ! -f "$CONFIG_FILE" ]; then
  CONFIG_FILE="$BACKEND_DIR/ecosystem.config.js"
fi
pm2 reload "$CONFIG_FILE" --env production || pm2 start "$CONFIG_FILE" --env production
pm2 save

# 7. Reload Nginx
echo "[5/5] Reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "======================================================================"
echo " AFRIQORA Deployment Complete & Service Online!"
echo " Health check: curl -i http://127.0.0.1:4001/api/health"
echo "======================================================================"
