#!/usr/bin/env bash
# ==============================================================================
# AFRIQORA Linux VPS Server Provisioning Script
# Target OS: Ubuntu 24.04 LTS or 22.04 LTS
# Usage: sudo bash 01-setup-server.sh
# ==============================================================================

set -euo pipefail

echo "======================================================================"
echo " Starting AFRIQORA Server Provisioning"
echo "======================================================================"

# 1. Verify root privileges
if [ "$EUID" -ne 0 ]; then
  echo "Error: Please run as root (e.g. sudo bash 01-setup-server.sh)"
  exit 1
fi

# 2. Update base system packages
echo "[1/6] Updating system packages..."
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git ufw build-essential nginx certbot python3-certbot-nginx

# 3. Install Node.js 22 LTS
echo "[2/6] Installing Node.js 22 LTS..."
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d'.' -f1)" != "v22" ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
echo "Node version: $(node -v)"
echo "NPM version:  $(npm -v)"

# 4. Install PM2 process manager
echo "[3/6] Installing PM2..."
npm install -g pm2

# 5. Configure UFW Firewall
echo "[4/6] Configuring firewall (UFW)..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
# Enable UFW without prompting
echo "y" | ufw enable
ufw status verbose

# 6. Create web directory structure
echo "[5/6] Creating deployment directories..."
mkdir -p /var/www/afriqora
mkdir -p /var/www/afriqora/backend/logs
mkdir -p /var/www/afriqora/backend/backups

# Detect non-root sudo user if running via sudo
TARGET_USER="${SUDO_USER:-root}"
chown -R "$TARGET_USER:$TARGET_USER" /var/www/afriqora

# 7. Configure PM2 Startup
echo "[6/6] Configuring PM2 system startup..."
env PATH=$PATH:/usr/bin pm2 startup systemd -u "$TARGET_USER" --hp "/home/$TARGET_USER" || true

echo "======================================================================"
echo " AFRIQORA Server Provisioning Complete!"
echo " Next step: Deploy code to /var/www/afriqora and run 02-deploy-app.sh"
echo "======================================================================"
