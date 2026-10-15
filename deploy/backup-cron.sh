#!/usr/bin/env bash
# ==============================================================================
# AFRIQORA Daily Automated Database Backup & Pruning Script
# Place in: /var/www/afriqora/deploy/backup-cron.sh
# Crontab: 0 2 * * * /bin/bash /var/www/afriqora/deploy/backup-cron.sh >> /var/www/afriqora/backend/logs/backup.log 2>&1
# ==============================================================================

set -euo pipefail

# Ensure standard system paths are available in cron environment
export PATH="/usr/bin:/usr/local/bin:$PATH"

BACKEND_DIR="/var/www/afriqora/backend"
BACKUP_DIR="$BACKEND_DIR/backups"

echo "======================================================================"
echo " [$(date -u)] Starting Scheduled Database Backup"
echo "======================================================================"

if [ -f "$BACKEND_DIR/scripts/backup-db.js" ]; then
  cd "$BACKEND_DIR"
  node scripts/backup-db.js
else
  echo "Error: backup-db.js not found in $BACKEND_DIR/scripts"
  exit 1
fi

# Prune backups older than 30 days
echo "Pruning backup archives older than 30 days..."
find "$BACKUP_DIR" -name "afriqora-db-backup-*.sqlite*" -type f -mtime +30 -delete

echo "[$(date -u)] Scheduled Backup Completed Successfully."
