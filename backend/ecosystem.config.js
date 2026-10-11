/**
 * AFRIQORA Production Process Manager Configuration (PM2)
 * Ensures high-availability, zero-downtime clustering, memory protection, and secure logging.
 */

module.exports = {
  apps: [
    {
      name: 'afriqora-production-api',
      script: './dist/index.js',
      cwd: __dirname,
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 4001,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/production-error.log',
      out_file: './logs/production-out.log',
      merge_logs: true,
    },
  ],
};
