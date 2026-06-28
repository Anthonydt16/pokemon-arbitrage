/* eslint-disable @typescript-eslint/no-require-imports */
module.exports = {
  apps: [
    {
      name: 'pokesnoop-web',
      script: './node_modules/.bin/next',
      args: 'start -p 3333',
      env: {
        NODE_ENV: 'production',
        PORT: '3333',
      },
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
    },
  ],
}
