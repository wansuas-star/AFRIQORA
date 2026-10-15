/**
 * AFRIQORA Production PM2 Process Configuration (SQLite-Safe)
 * Configured specifically for single-instance mode to prevent SQLite file-locking.
 */

module.exports = {
  apps: [
    {
      name: 'afriqora-production-api',
      script: './dist/index.js',
      cwd: '/var/www/afriqora/backend',
      instances: 1, // Single instance ensures SQLite concurrency safety
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 4001,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/www/afriqora/backend/logs/production-error.log',
      out_file: '/var/www/afriqora/backend/logs/production-out.log',
      merge_logs: true,
    },
  ],
};
